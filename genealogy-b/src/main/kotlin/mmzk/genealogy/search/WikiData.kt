package mmzk.genealogy.search

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.logging.*
import io.ktor.client.request.*
import mmzk.genealogy.dao.Individual
import mmzk.genealogy.dto.IndividualDTO
import mmzk.genealogy.dto.RelationsResponse
import mmzk.genealogy.dto.RelationshipDTO
import com.google.gson.JsonElement
import com.google.gson.JsonParser
import io.ktor.client.statement.*
import io.ktor.http.userAgent
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import mmzk.genealogy.tables.Fields
import org.jetbrains.exposed.sql.transactions.transaction

object WikiData {
    private val client = HttpClient(CIO) {
        install(Logging) {
            level = LogLevel.INFO
        }
    }

    // Translate a WikiData ID into a Database ID
    fun makeID(id: String): String = "WD-$id"

    // Get the values corresponding to the list of WikiData IDs.
    suspend fun getValues(ids: List<String>) = coroutineScope {
        val url = ids.joinToString(separator = "|").let {
            "https://www.wikidata.org/w/api.php?action=wbgetentities&ids=$it&props=labels&languages=en&formatversion=2&format=json"
        }
        val response = client.get(url)

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

    // Get the values and claims corresponding to the list of WikiData IDs
    suspend fun getValuesAndClaims(ids: List<String>) = coroutineScope {
        val url = ids.joinToString(separator = "|").let {
            "https://www.wikidata.org/w/api.php?action=wbgetentities&ids=$it&props=labels|claims&languages=en&formatversion=2&format=json"
        }
        val response = client.get(url)

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

    suspend fun query(id: String): IndividualDTO? {
        suspend fun JsonElement.readProperties(queries: List<String>) = coroutineScope {
            val knownResults = mutableMapOf<String, String?>()
            val indirections = mutableMapOf<String, String?>()

            for (query in queries) {
                this@readProperties.asObjectOrNull?.get(query)?.asArrayOrNull?.get(0)?.asObjectOrNull?.let { data ->
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

        suspend fun JsonElement.readProperties(queries: Map<String, (suspend (List<Triple<String?, JsonElement?, JsonElement?>>) -> String?)?>) =
            coroutineScope {
                val knownResults = mutableMapOf<String, MutableList<Triple<String?, JsonElement?, JsonElement?>>>()
                val deferrals = mutableMapOf<String, Deferred<String?>>()
                val indirections = mutableMapOf<String, MutableList<Pair<String?, JsonElement?>>>()
                val results = mutableMapOf<String, String?>()
                for (query in queries) {
                    knownResults[query.key] = mutableListOf()
                    indirections[query.key] = mutableListOf()
                    this@readProperties.asObjectOrNull?.get(query.key)?.asArrayOrNull?.map { data ->
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
            val country = pcq?.second?.asObjectOrNull?.readProperties(listOf(Fields.country))?.values?.first()
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

            listOfNotNull(familyName, maidenName).joinToString(separator = "&")
        }

        return coroutineScope {
            try {
                val (name, claims) = getValuesAndClaims(listOf(id)).values.first()
                val gender =
                    when (claims?.asObjectOrNull?.get(Fields.gender)?.asArrayOrNull?.firstOrNull()
                        ?.asObjectOrNull?.get("mainsnak")?.asObjectOrNull?.get("datavalue")
                        ?.asObjectOrNull?.get("value")?.asObjectOrNull?.get("id")?.asStringOrNull) {
                        Fields.female -> 'F'
                        Fields.male -> 'M'
                        else -> 'U'
                    }
                val queries =
                    mapOf(
                        Fields.dateOfBirth to null,
                        Fields.dateOfDeath to null,
                        Fields.placeOfBirth to ::countryOfPlace,
                        Fields.placeOfDeath to ::countryOfPlace,
                        Fields.givenName to ::parseGivenName,
                        Fields.familyName to ::parseFamilyName
                    )
                val queryResults = claims?.readProperties(queries)
                val givenName = queryResults?.get(Fields.givenName)
                val personalName = queryResults?.get(Fields.familyName)?.let { familyName ->
                    val familyNameSplit = familyName.split("&", limit = 2)
                    if (familyNameSplit.size == 1) {
                        givenName?.let { "$familyName, $givenName" } ?: familyName
                    } else {
                        givenName?.let { "${familyNameSplit[0]}, $givenName, née ${familyNameSplit[1]}" }
                            ?: "${familyNameSplit[0]}, née ${familyNameSplit[1]}"
                    }
                } ?: givenName

                name?.let {
                    IndividualDTO(
                        id,
                        it,
                        personalName ?: it,
                        queryResults?.get(Fields.dateOfBirth),
                        queryResults?.get(Fields.dateOfDeath),
                        queryResults?.get(Fields.placeOfBirth),
                        queryResults?.get(Fields.placeOfDeath),
                        gender,
                        false
                    )
                }
            } catch (e: Exception) {
                println(e)
                null
            }
        }
    }

    fun searchId(id: String, typeFilter: List<String>?, depth: Int = 1): RelationsResponse {
        fun visit(
            visited: MutableList<String> = mutableListOf(),
            frontier: MutableList<Pair<Int, String>> = mutableListOf(),
            relativeCountMap: MutableMap<String, Int> = mutableMapOf(),
            reverseRelatives: MutableMap<String, MutableSet<String>> = mutableMapOf()
        ): Pair<MutableSet<IndividualDTO>, MutableSet<RelationshipDTO>> {
            val people = mutableSetOf<IndividualDTO>()
            val relations = mutableSetOf<RelationshipDTO>()

            while (frontier.isNotEmpty()) {
                val (curDepth, curId) = frontier.removeFirst()

                if (curId in visited) {
                    continue
                }

                val curResult = Database.searchId(curId, typeFilter)

                curResult?.let {
                    if (it.target.isCached) {
                        people.addAll(it.people)
                        relations.addAll(it.relations)

                        if (curDepth < depth) {
                            frontier.addAll(it.people.filter { p -> !visited.contains(p.id) }
                                .map { curDepth + 1 to id })
                        }

                        visited.add(it.target.id)
                    } else {
                        val (newPeople, newRelations) = mutableSetOf<IndividualDTO>() to mutableSetOf<RelationshipDTO>()
                        people.addAll(newPeople)
                        relations.addAll(newRelations)

                        if (curDepth < depth) {
                            for (p in newPeople) {
                                if (p.id in visited) {
                                    continue
                                }

                                frontier.add(curDepth + 1 to p.id)
                                relativeCountMap[it.target.id] = 1 + (relativeCountMap[it.target.id] ?: 0)
                                reverseRelatives[p.id]?.add(it.target.id)
                                    ?: run { reverseRelatives[p.id] = mutableSetOf(it.target.id) }
                            }
                        }

                        visited.add(it.target.id)
                    }
                } ?: run {
                    // TODO: Look up entry on WikiData
                }
            }

            return people to relations
        }

        val (people, relations) = visit(frontier = mutableListOf(0 to id))
        val target = IndividualDTO(transaction { Individual.findById(id) }!!)

        return RelationsResponse(target, people.toList(), relations.toList())
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
