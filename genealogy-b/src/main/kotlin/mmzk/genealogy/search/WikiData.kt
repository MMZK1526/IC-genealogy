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
        this.engine { this.threadsCount = 8 }
    }

    // Translate a WikiData ID into a Database ID
    fun makeID(id: String): String = "WD-$id"

    suspend fun query(id: String): IndividualDTO? {
        // Get the values and claims corresponding to the list of WikiData IDs
        suspend fun getValuesAndClaims(ids: List<String>) = coroutineScope {
            if (ids.isEmpty()) {
                mapOf()
            } else {
                val idsStr = ids.reduce { id1, id2 -> "$id1|$id2" }
                val url =
                    "https://www.wikidata.org/w/api.php?action=wbgetentities&ids=$idsStr&props=labels%7Cclaims&languages=en&formatversion=2&format=json"
                val response = client.get(url)

                ids.map {
                    it to run {
                        val entity = JsonParser.parseString(response.bodyAsText()).asObjectOrNull?.get("entities")
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

        suspend fun JsonElement.readPropertiesReferences(queries: Map<String, (suspend (String?, JsonElement?) -> String?)?>) =
            coroutineScope {
                val knownResults = mutableMapOf<String, Pair<String?, JsonElement?>>();
                val deferrals = mutableMapOf<String, Deferred<Pair<String?, JsonElement?>>>();
                val indirections = mutableMapOf<String, Pair<String?, JsonElement?>>();
                for (query in queries) {
                    val data =
                        this@readPropertiesReferences.asObjectOrNull?.get(query.key)?.asArrayOrNull?.get(0)?.asObjectOrNull
                    val references = data?.get("references")
                    val dataValue = data?.get("mainsnak")?.asObjectOrNull?.get("datavalue")?.asObjectOrNull
                    when (dataValue?.get("type")?.asStringOrNull) {
                        Fields.string -> deferrals[query.key] = async {
                            val propertyValue = dataValue["value"].asStringOrNull
                            (query.value?.invoke(propertyValue, null) ?: propertyValue) to references
                        }
                        Fields.time -> deferrals[query.key] = async {
                            val timestamp =
                                dataValue.asObjectOrNull?.get("value")?.asObjectOrNull?.get("time")?.asStringOrNull
                            (query.value?.invoke(timestamp, null)
                                ?: timestamp) to references
                        }
                        Fields.wikiBaseEntityId -> indirections[query.key] =
                            dataValue.asObjectOrNull?.get("value")?.asObjectOrNull?.get("id")?.asStringOrNull to references
                    }
                }

                val valueClaims = getValuesAndClaims(indirections.values.mapNotNull { it.first }.toList())
                for (i in indirections) {
                    deferrals[i.key] = async {
                        i.value.first?.let {
                            queries[i.key]?.invoke(
                                valueClaims[it]?.first,
                                valueClaims[it]?.second
                            ) ?: valueClaims[it]?.first
                        } to indirections[i.key]?.second
                    }
                }

                for (d in deferrals) {
                    knownResults[d.key] = d.value.await()
                }

                knownResults
            }

        suspend fun countryOfPlace(place: String?, claims: JsonElement?): String? = coroutineScope {
            val country =
                claims?.asObjectOrNull?.readPropertiesReferences(mapOf(Fields.country to null))?.values?.first()?.first
            place?.let { p -> country?.let { "$p, $it" } ?: p }
        }

        return coroutineScope {
            try {
                val (name, claims) = getValuesAndClaims(listOf(id)).values.first()
                val gender =
                    when (claims?.asObjectOrNull?.get(Fields.gender)?.asArrayOrNull?.get(0)?.asObjectOrNull?.get("mainsnak")?.asObjectOrNull?.get(
                        "datavalue"
                    )
                        ?.asObjectOrNull?.get("value")?.asObjectOrNull?.get("id")
                        ?.asStringOrNull) {
                        Fields.female -> 'F'
                        Fields.male -> 'M'
                        else -> 'U'
                    }
                val queries =
                    mapOf(
                        Fields.dateOfBirth to null,
                        Fields.dateOfDeath to null,
                        Fields.placeOfBirth to ::countryOfPlace,
                        Fields.placeOfDeath to ::countryOfPlace
                    )
                val queryResults = claims?.readPropertiesReferences(queries)
//                val placeOfBirthAsync = async {
//                    claims?.asObjectOrNull?.get(Fields.placeOfBirth)?.asArrayOrNull?.get(0)
//                        ?.readProperty(::countryOfPlace)
//                }
//                val placeOfDeathAsync =
//                    async {
//                        claims?.asObjectOrNull?.get(Fields.placeOfDeath)?.asArrayOrNull?.get(0)
//                            ?.readProperty(::countryOfPlace)
//                    }
//                val dateOfBirthAsync =
//                    async { claims?.asObjectOrNull?.get(Fields.dateOfBirth)?.asArrayOrNull?.get(0)?.readProperty() }
//                val dateOfDeathAsync =
//                    async { claims?.asObjectOrNull?.get(Fields.dateOfDeath)?.asArrayOrNull?.get(0)?.readProperty() }
                val personalName = "TODO" // TODO
                name?.let {
                    IndividualDTO(
                        id,
                        it,
                        personalName,
                        queryResults?.get(Fields.dateOfBirth)?.first,
                        queryResults?.get(Fields.dateOfDeath)?.first,
                        queryResults?.get(Fields.placeOfBirth)?.first,
                        queryResults?.get(Fields.placeOfDeath)?.first,
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
