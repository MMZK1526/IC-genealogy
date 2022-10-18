package mmzk.genealogy.search

import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.logging.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import kotlinx.coroutines.*
import mmzk.genealogy.dao.Individual
import mmzk.genealogy.dto.IndividualDTO
import mmzk.genealogy.dto.RelationsResponse
import mmzk.genealogy.dto.RelationshipDTO
import mmzk.genealogy.tables.Fields
import org.jetbrains.exposed.sql.transactions.transaction
import java.net.URLEncoder

object WikiData {
    private val client = HttpClient(CIO) {
        install(Logging) {
            level = LogLevel.INFO
        }
    }

    // Translate a WikiData ID into a Database ID
    private fun makeID(id: String): String = "WD-$id"

    // Fetch at most four IDs that partially matches the search query
    suspend fun searchName(name: String) = coroutineScope {
        val urlEncodedName = withContext(Dispatchers.IO) {
            URLEncoder.encode(name, "utf-8")
        }
        val url =
            "https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&search=$urlEncodedName&language=en&limit=4&props=url&formatversion=latest"
        val response = client.get(url)
        JsonParser.parseString(response.bodyAsText()).asObjectOrNull?.get("search")?.asArrayOrNull?.mapNotNull {
            it?.asObjectOrNull?.get("id")?.asStringOrNull
        }
    }

    // Get the values corresponding to the list of WikiData IDs.
    private suspend fun getValues(ids: List<String>) = coroutineScope {
        if (ids.isEmpty()) {
            mapOf()
        } else {
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
    }

    // Get the values and claims corresponding to the list of WikiData IDs
    private suspend fun getValuesAndClaims(ids: List<String>) = coroutineScope {
        if (ids.isEmpty()) {
            mapOf()
        } else {
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
                if (it.isBlank()) {
                    null
                } else {
                    it
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

                val curResult = Database.findRelatedPeople(curId, typeFilter)

                curResult.let {
                    if (it.targets.first().isCached) {
                        people.addAll(it.people)
                        relations.addAll(it.relations)

                        if (curDepth < depth) {
                            frontier.addAll(it.people.filter { p -> !visited.contains(p.id) }
                                .map { curDepth + 1 to id })
                        }

                        visited.add(it.targets.first().id)
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
                                relativeCountMap[it.targets.first().id] =
                                    1 + (relativeCountMap[it.targets.first().id] ?: 0)
                                reverseRelatives[p.id]?.add(it.targets.first().id)
                                    ?: run { reverseRelatives[p.id] = mutableSetOf(it.targets.first().id) }
                            }
                        }

                        visited.add(it.targets.first().id)
                    }
                }
            }

            return people to relations
        }

        val (people, relations) = visit(frontier = mutableListOf(0 to id))
        val target = IndividualDTO(transaction { Individual.findById(id) }!!)

        return RelationsResponse(listOf(target), people.toList(), relations.toList())
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
