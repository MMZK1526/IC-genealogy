package mmzk.genealogy.search

import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.logging.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.util.*
import java.util.*
import kotlin.collections.*
import kotlinx.coroutines.*
import mmzk.genealogy.dto.IndividualDTO
import mmzk.genealogy.dto.IndividualName
import mmzk.genealogy.tables.Fields
import org.eclipse.rdf4j.query.TupleQueryResult
import org.eclipse.rdf4j.queryrender.RenderUtils
import org.eclipse.rdf4j.repository.sparql.SPARQLRepository

object WikiData {
    private val client = HttpClient(CIO) {
        install(Logging) {
            level = LogLevel.INFO
        }
    }

    // Translate a WikiData ID into a Database ID.
    private fun makeID(id: String): String = "WD-$id"

    // Build the WikiData GET request URL with IDs.
    private fun makeQueryURL(ids: List<String>, getClaims: Boolean) = ids.joinToString(separator = "|").let {
        url {
            host = "www.wikidata.org"
            path("/w/api.php")
            parameters.append("action", "wbgetentities")
            parameters.append("format", "json")
            parameters.append("ids", it)
            parameters.append("languages", "en")
            parameters.append(
                "props", "labels${
                    if (getClaims) {
                        "|claims"
                    } else {
                        ""
                    }
                }"
            )
            parameters.append("formatversion", "2")
        }
    }

    private fun formatLocationWithCountry(location: String?, country: String?) =
        if (location != null && country != null) {
            "$location, $country"
        } else location ?: if (country != null) {
            country
        } else {
            null
        }

    private suspend fun parseSearchResults(results: TupleQueryResult) = coroutineScope {
        val dtos = mutableMapOf<String, IndividualDTO>()
        val personalNames = mutableMapOf<String, IndividualName>()
        for (result in results) {
            val row = mutableMapOf<String, String>()
            for (value in result) {
                row[value.name] = value.value.stringValue()
            }
            val id = row[SPARQL.item]?.let(::Url)?.pathSegments?.lastOrNull()?.let { makeID(it) } ?: continue
            if (!dtos.contains(id)) {
                val name = row[SPARQL.name]
                if (name != null) {
                    dtos[id] = IndividualDTO(
                        id,
                        name,
                        "",
                        row[SPARQL.dateOfBirth],
                        row[SPARQL.dateOfDeath],
                        formatLocationWithCountry(
                            row["${SPARQL.placeOfBirth}Label"],
                            row["${SPARQL.placeOfBirthCountry}Label"]
                        ),
                        formatLocationWithCountry(
                            row["${SPARQL.placeOfDeath}Label"],
                            row["${SPARQL.placeOfDeathCountry}Label"]
                        ),
                        when (row["${SPARQL.gender}Label"]) {
                            "male" -> 'M'
                            "female" -> 'F'
                            else -> 'U'
                        }
                    )
                    personalNames[id] = IndividualName()
                }
            }
            row["${SPARQL.givenName}Label"]?.let { n ->
                personalNames[id]?.givenNames?.set(
                    row[SPARQL.ordinal]?.toIntOrNull() ?: 0, n
                )
            }
            row["${SPARQL.familyName}Label"]?.let { n ->
                if (row["${SPARQL.familyNameType}Label"] == "maiden name") {
                    personalNames[id]?.maidenName = n
                } else {
                    personalNames[id]?.marriageName = n
                }
            }
        }
        for ((id, dto) in dtos) {
            dto.personalName = personalNames[id]?.fullName ?: dto.name
        }
        dtos.values.toList()
    }

    suspend fun searchByName(partialName: String) = coroutineScope {
        val sparqlEndpoint = "https://query.wikidata.org/sparql"
        val repo = SPARQLRepository(sparqlEndpoint)

        val userAgent = "WikiData Crawler for Genealogy Visualiser WebApp, Contact piopio555888@gmail.com"
        repo.additionalHttpHeaders = Collections.singletonMap("User-Agent", userAgent)

        val querySelect = """
              SELECT ?${SPARQL.item} ?${SPARQL.name} ?${SPARQL.givenName}Label ?${SPARQL.familyName}Label ?${SPARQL.ordinal} ?${SPARQL.familyNameType}Label ?${SPARQL.dateOfBirth} ?${SPARQL.dateOfDeath} ?${SPARQL.placeOfBirth}Label ?${SPARQL.placeOfBirthCountry}Label ?${SPARQL.placeOfDeath}Label ?${SPARQL.placeOfDeathCountry}Label ?${SPARQL.gender}Label WHERE {
                  ?${SPARQL.item} wdt:P31 wd:Q5.

                  ?${SPARQL.item} p:P735 ?${SPARQL.givenName}_ .
                  ?${SPARQL.givenName}_ ps:P735 ?${SPARQL.givenName} .
                  OPTIONAL { ?${SPARQL.givenName}_ pq:P1545 ?${SPARQL.ordinal} . }
                  OPTIONAL { ?${SPARQL.item} p:P734 ?${SPARQL.familyName}_ .
                             ?${SPARQL.familyName}_ ps:P734 ?${SPARQL.familyName} .
                             OPTIONAL { ?${SPARQL.familyName}_ pq:P3831 ?${SPARQL.familyNameType} . } }
                  OPTIONAL { ?${SPARQL.item} wdt:P569 ?${SPARQL.dateOfBirth} . }
                  OPTIONAL { ?${SPARQL.item} wdt:P570 ?${SPARQL.dateOfDeath} . }
                  OPTIONAL { ?${SPARQL.item} p:P19 ?${SPARQL.placeOfBirth}_ .
                             ?${SPARQL.placeOfBirth}_ ps:P19 ?${SPARQL.placeOfBirth} .
                             ?${SPARQL.placeOfBirth} wdt:P17 ?${SPARQL.placeOfBirthCountry} . }
                  OPTIONAL { ?${SPARQL.item} p:P20 ?${SPARQL.placeOfDeath}_ .
                             ?${SPARQL.placeOfDeath}_ ps:P20 ?${SPARQL.placeOfDeath} .
                             ?${SPARQL.placeOfDeath} wdt:P17 ?${SPARQL.placeOfDeathCountry} . }
                  OPTIONAL { ?${SPARQL.item} wdt:P21 ?${SPARQL.gender} . }
                  SERVICE wikibase:mwapi {
                    bd:serviceParam wikibase:api "EntitySearch" .
                    bd:serviceParam wikibase:endpoint "www.wikidata.org" .
                    bd:serviceParam mwapi:search "${RenderUtils.escape(partialName)}" .
                    bd:serviceParam mwapi:action "wbsearchentities" .
                    bd:serviceParam mwapi:language "en" .
                    ?item wikibase:apiOutputItem mwapi:item .
                  }
                  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
                }
        """.trimIndent()
        val results = try {
            repo.connection.prepareTupleQuery(querySelect).evaluate()
        } catch (exception: Exception) {
            exception.printStackTrace()
            null
        }

        println("FINIED")
        results?.let { parseSearchResults(it) } ?: listOf()
    }

    suspend fun searchByIDs(ids: List<String>) = coroutineScope {
        val sparqlEndpoint = "https://query.wikidata.org/sparql"
        val repo = SPARQLRepository(sparqlEndpoint)

        val userAgent = "WikiData Crawler for Genealogy Visualiser WebApp, Contact piopio555888@gmail.com"
        repo.additionalHttpHeaders = Collections.singletonMap("User-Agent", userAgent)
        val querySelect = """
              SELECT ?${SPARQL.item} ?${SPARQL.name} ?${SPARQL.givenName}Label ?${SPARQL.familyName}Label ?${SPARQL.ordinal} ?${SPARQL.familyNameType}Label ?${SPARQL.dateOfBirth} ?${SPARQL.dateOfDeath} ?${SPARQL.placeOfBirth}Label ?${SPARQL.placeOfBirthCountry}Label ?${SPARQL.placeOfDeath}Label ?${SPARQL.placeOfDeathCountry}Label ?${SPARQL.gender}Label WHERE {
                  VALUES ?${SPARQL.item} { ${ids.joinToString(" ") { "wd:$it" }} } .

                  ?${SPARQL.item} p:P735 ?${SPARQL.givenName}_ .
                  ?${SPARQL.givenName}_ ps:P735 ?${SPARQL.givenName} .
                  OPTIONAL { ?${SPARQL.givenName}_ pq:P1545 ?${SPARQL.ordinal} . }
                  OPTIONAL { ?${SPARQL.item} p:P734 ?${SPARQL.familyName}_ .
                             ?${SPARQL.familyName}_ ps:P734 ?${SPARQL.familyName} .
                              OPTIONAL { ?${SPARQL.familyName}_ pq:P3831 ?${SPARQL.familyNameType} . } }
                  OPTIONAL { ?${SPARQL.item} wdt:P569 ?${SPARQL.dateOfBirth} . }
                  OPTIONAL { ?${SPARQL.item} wdt:P570 ?${SPARQL.dateOfDeath} . }
                  OPTIONAL { ?${SPARQL.item} p:P19 ?${SPARQL.placeOfBirth}_ .
                             ?${SPARQL.placeOfBirth}_ ps:P19 ?${SPARQL.placeOfBirth} .
                             ?${SPARQL.placeOfBirth} wdt:P17 ?${SPARQL.placeOfBirthCountry} . }
                  OPTIONAL { ?${SPARQL.item} p:P20 ?${SPARQL.placeOfDeath}_ .
                             ?${SPARQL.placeOfDeath}_ ps:P20 ?${SPARQL.placeOfDeath} .
                             ?${SPARQL.placeOfDeath} wdt:P17 ?${SPARQL.placeOfDeathCountry} . }
                  OPTIONAL { ?${SPARQL.item} wdt:P21 ?${SPARQL.gender} . }
                  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
                }
        """.trimIndent()
        val results = try {
            repo.connection.prepareTupleQuery(querySelect).evaluate()

        } catch (exception: Exception) {
            exception.printStackTrace()
            null
        }

        results?.let { parseSearchResults(it) } ?: listOf()
    }

    // Get the values corresponding to the list of WikiData IDs.
    private suspend fun getValues(ids: List<String>) = coroutineScope {
        if (ids.isEmpty()) {
            mapOf()
        } else {
            val response = client.get(makeQueryURL(ids, false))

            ids.map {
                it to run {
                    val entity =
                        JsonParser.parseString(response.bodyAsText()).asObjectOrNull?.get("entities")
                            ?.asObjectOrNull?.get(it)?.asObjectOrNull
                    entity
                        ?.get("labels")
                        ?.asObjectOrNull?.get("en")
                        ?.asObjectOrNull?.get("value")
                        ?.asStringOrNull

                }
            }.associate { it }
        }
    }

    // Get the values and claims corresponding to the list of WikiData IDs
    private suspend fun getValuesAndClaims(ids: List<String>) = coroutineScope {
        if (ids.isEmpty()) {
            mapOf()
        } else {
            val response = client.get(makeQueryURL(ids, true))

            ids.map {
                it to run {
                    val entity =
                        JsonParser.parseString(response.bodyAsText()).asObjectOrNull?.get("entities")
                            ?.asObjectOrNull?.get(it)?.asObjectOrNull
                    entity
                        ?.get("labels")
                        ?.asObjectOrNull?.get("en")
                        ?.asObjectOrNull?.get("value")
                        ?.asStringOrNull to entity?.get("claims")

                }
            }.associate { it }
        }
    }

    suspend fun query(ids: List<String>): List<IndividualDTO> {
        suspend fun readProperties(claims: Map<String?, JsonObject>, queries: List<Pair<String?, String>>) =
            coroutineScope {
                val knownResults = mutableMapOf<Pair<String?, String>, String?>()
                val indirections = mutableMapOf<Pair<String?, String>, String?>()

                for (query in queries) {
                    claims[query.first]?.asObjectOrNull?.get(query.second)?.asArrayOrNull?.get(0)?.asObjectOrNull?.let { data ->
                        val dataValue =
                            data.asObjectOrNull?.get("mainsnak")?.asObjectOrNull?.get("datavalue")?.asObjectOrNull

                        when (dataValue?.get("type")?.asStringOrNull) {
                            Fields.string -> knownResults[query] = dataValue["value"].asStringOrNull
                            Fields.time -> knownResults[query] =
                                dataValue.asObjectOrNull?.get("value")?.asObjectOrNull?.get("time")?.asStringOrNull
                            Fields.wikiBaseEntityId -> indirections[query] =
                                dataValue.asObjectOrNull?.get("value")?.asObjectOrNull?.get("id")?.asStringOrNull
                        }
                    }
                }

                val values = getValues(indirections.values.filterNotNull().toList())

                for (i in indirections) {
                    knownResults[i.key] = i.value?.let { values[it] }
                }

                knownResults
            }

        suspend fun readProperties(
            claims: Map<String?, JsonObject>,
            queries: Map<Pair<String?, String>, (suspend (List<Triple<String?, JsonElement?, JsonElement?>>) -> String?)?>
        ) =
            coroutineScope {
                val knownResults =
                    mutableMapOf<Pair<String?, String>, MutableList<Triple<String?, JsonElement?, JsonElement?>>>()
                val deferrals = mutableMapOf<Pair<String?, String>, Deferred<String?>>()
                val indirections = mutableMapOf<Pair<String?, String>, MutableList<Pair<String?, JsonElement?>>>()
                val results = mutableMapOf<Pair<String?, String>, String?>()
                for (query in queries) {
                    knownResults[query.key] = mutableListOf()
                    indirections[query.key] = mutableListOf()
                    claims[query.key.first]?.asObjectOrNull?.get(query.key.second)?.asArrayOrNull?.map { data ->
                        val qualifiers = data.asObjectOrNull?.get("qualifiers")
                        val dataValue =
                            data.asObjectOrNull?.get("mainsnak")?.asObjectOrNull?.get("datavalue")?.asObjectOrNull

                        when (dataValue?.get("type")?.asStringOrNull) {
                            Fields.string -> knownResults[query.key]?.add(
                                Triple(dataValue["value"].asStringOrNull, null, qualifiers)
                            )
                            Fields.time -> knownResults[query.key]?.add(
                                Triple(
                                    dataValue.asObjectOrNull?.get("value")?.asObjectOrNull?.get("time")?.asStringOrNull,
                                    null,
                                    qualifiers
                                )
                            )
                            Fields.wikiBaseEntityId -> indirections[query.key]?.add(
                                dataValue.asObjectOrNull?.get("value")?.asObjectOrNull?.get("id")?.asStringOrNull to qualifiers
                            )
                            else -> null
                        }
                    }
                }

                val valueClaims = getValuesAndClaims(indirections.values.flatten().mapNotNull { it.first }.toList())
                for (i in indirections) {
                    knownResults[i.key]?.addAll(i.value.map { (id, qualifiers) ->
                        Triple(
                            valueClaims[id]?.first,
                            valueClaims[id]?.second,
                            qualifiers
                        )
                    })
                    deferrals[i.key] = async {
                        knownResults[i.key]?.let { queries[i.key]?.invoke(it) ?: it.firstOrNull()?.first }
                    }
                }

                for (d in deferrals) {
                    results[d.key] = d.value.await()
                }

                results
            }

        suspend fun countryOfPlace(pcqs: List<Triple<String?, JsonElement?, JsonElement?>>) = coroutineScope {
            val pcq = pcqs.firstOrNull()
            val country = pcq?.second?.asObjectOrNull?.let {
                readProperties(
                    mapOf(null to it),
                    listOf(null to Fields.country)
                ).values.first()
            }
            pcq?.first?.let { p -> country?.let { "$p, $it" } ?: p }
        }

        suspend fun parseGivenName(pcqs: List<Triple<String?, JsonElement?, JsonElement?>>) = coroutineScope {
            var hasOrdinal = false
            val nameOrdList = mutableListOf<Pair<String, Int>>()

            for (pcq in pcqs) {
                val ordinal =
                    pcq.third?.asObjectOrNull?.get(Fields.seriesOrdinal)?.asArrayOrNull?.firstOrNull()?.asObjectOrNull
                        ?.get("datavalue")?.asObjectOrNull?.get("value")?.asStringOrNull?.toIntOrNull() ?: 0
                if (ordinal != 0) {
                    hasOrdinal = true
                }

                pcq.first?.let {
                    nameOrdList.add(it to ordinal)
                    if (ordinal != 0) {
                        hasOrdinal = true
                    }
                }
            }

            if (hasOrdinal) {
                nameOrdList.sortBy { it.second }
                nameOrdList.filter { it.second != 0 }.map { it.first }.reduceOrNull { n1, n2 -> "$n1 $n2" }
            } else {
                nameOrdList.firstOrNull()?.first
            }
        }

        suspend fun parseFamilyName(pcqs: List<Triple<String?, JsonElement?, JsonElement?>>) = coroutineScope {
            var maidenName: String? = null
            var familyName: String? = null

            for (pcq in pcqs) {
                if (pcq.third?.asObjectOrNull?.get(Fields.objectHasRole)?.asArrayOrNull?.firstOrNull()?.asObjectOrNull
                        ?.get("datavalue")?.asObjectOrNull?.get("value")?.asObjectOrNull?.get("id")?.asStringOrNull == Fields.maidenName
                ) {
                    maidenName = pcq.first
                } else {
                    familyName = pcq.first
                }

                if (maidenName != null && familyName != null) {
                    break
                }
            }

            listOfNotNull(familyName, maidenName).joinToString(separator = "&").let {
                it.ifBlank {
                    null
                }
            }
        }

        return coroutineScope {
            try {
                val humanIds = mutableListOf<String>()
                val genderMap = mutableMapOf<String, Char>()
                val nameMap = mutableMapOf<String, String>()
                val claimMap = mutableMapOf<String?, JsonObject>()
                val queries =
                    mutableMapOf<Pair<String?, String>, (suspend (List<Triple<String?, JsonElement?, JsonElement?>>) -> String?)?>()
                val nameClaims = getValuesAndClaims(ids)

                for (entry in nameClaims) {
                    val id = entry.key
                    val (name, claims) = entry.value
                    if (claims?.asObjectOrNull?.get(Fields.instanceOf)?.asArrayOrNull?.map
                        {
                            it?.asObjectOrNull?.get("mainsnak")?.asObjectOrNull?.get("datavalue")?.asObjectOrNull
                                ?.get("value")?.asObjectOrNull?.get("id")?.asStringOrNull
                        }
                            ?.contains(Fields.human) == true
                    ) {
                        humanIds.add(id)
                    } else {
                        continue
                    }

                    genderMap[id] = when (claims.asObjectOrNull?.get(Fields.gender)?.asArrayOrNull?.firstOrNull()
                        ?.asObjectOrNull?.get("mainsnak")?.asObjectOrNull?.get("datavalue")
                        ?.asObjectOrNull?.get("value")?.asObjectOrNull?.get("id")?.asStringOrNull) {
                        Fields.female -> 'F'
                        Fields.male -> 'M'
                        else -> 'U'
                    }
                    name?.let { nameMap[id] = it }
                    claims.asObjectOrNull?.let { claimMap[id] = it }
                    queries[id to Fields.dateOfBirth] = null
                    queries[id to Fields.dateOfDeath] = null
                    queries[id to Fields.placeOfBirth] = ::countryOfPlace
                    queries[id to Fields.placeOfDeath] = ::countryOfPlace
                    queries[id to Fields.givenName] = ::parseGivenName
                    queries[id to Fields.familyName] = ::parseFamilyName
                }

                val queryResults = readProperties(claimMap, queries)

                humanIds.mapNotNull { id ->
                    val givenName = queryResults[id to Fields.givenName]
                    val personalName = queryResults[id to Fields.familyName]?.let { familyName ->
                        val familyNameSplit = familyName.split("&", limit = 2)
                        if (familyNameSplit.size == 1) {
                            givenName?.let { "$familyName, $givenName" } ?: familyName
                        } else {
                            givenName?.let { "${familyNameSplit[0]}, $givenName, née ${familyNameSplit[1]}" }
                                ?: "${familyNameSplit[0]}, née ${familyNameSplit[1]}"
                        }
                    } ?: givenName

                    nameMap[id]?.let {
                        IndividualDTO(
                            makeID(id),
                            it,
                            personalName ?: it,
                            queryResults[id to Fields.dateOfBirth],
                            queryResults[id to Fields.dateOfDeath],
                            queryResults[id to Fields.placeOfBirth],
                            queryResults[id to Fields.placeOfDeath],
                            genderMap[id] ?: 'U',
                            false
                        )
                    }
                }
            } catch (e: Exception) {
                println(e)
                listOf()
            }
        }
    }

    private object SPARQL {
        const val item = "item"
        const val name = "itemLabel"
        const val gender = "gender"
        const val givenName = "fname"
        const val familyName = "lname"
        const val ordinal = "ordinal"
        const val familyNameType = "maiden"
        const val dateOfBirth = "dateOfBirth"
        const val dateOfDeath = "dateOfDeath"
        const val placeOfBirth = "placeOfBirth"
        const val placeOfBirthCountry = "placeOfBirthCountry"
        const val placeOfDeath = "placeOfDeath"
        const val placeOfDeathCountry = "placeOfDeathCountry"
    }
}

val JsonElement.asObjectOrNull
    get() = if (isJsonObject) {
        asJsonObject
    } else {
        null
    }
val JsonElement.asArrayOrNull
    get() = if (isJsonArray) {
        asJsonArray
    } else {
        null
    }
val JsonElement.asStringOrNull
    get() = if (isJsonPrimitive) {
        asString
    } else {
        null
    }
