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

    fun makeID(id: String): String = "WD-$id"

    suspend fun query(id: String): IndividualDTO? {
        suspend fun getValueAndClaims(id: String) = coroutineScope {
            val url =
                "https://www.wikidata.org/w/api.php?action=wbgetentities&ids=$id&props=labels%7Cclaims&languages=en&formatversion=2&format=json"
            val response = client.get(url)
            val entity = JsonParser.parseString(response.bodyAsText()).asObjectOrNull?.get("entities")
                ?.asObjectOrNull?.get(id)
            val value = entity
                ?.asObjectOrNull?.get("labels")
                ?.asObjectOrNull?.get("en")
                ?.asObjectOrNull?.get("value")
                ?.asStringOrNull
            val claims = entity?.asObjectOrNull?.get("claims")
            value to claims
        }

        suspend fun JsonElement.readPropertyReference(callback: suspend (String?, JsonElement?) -> String? = { str, _ -> str }): Pair<String?, JsonElement?> =
            coroutineScope {
                val dataValue =
                    this@readPropertyReference.asObjectOrNull?.get("mainsnak")?.asObjectOrNull?.get("datavalue")
                val dataValueMap = dataValue?.asObjectOrNull
                val references = this@readPropertyReference.asObjectOrNull?.get("references")
                when (dataValueMap?.get("type")?.asStringOrNull) {
                    Fields.string -> dataValueMap["value"].asStringOrNull to references
                    Fields.time -> dataValue.asObjectOrNull?.get("value")?.asObjectOrNull?.get("time")?.asStringOrNull to references
                    Fields.wikiBaseEntityId -> dataValue.asObjectOrNull?.get("value")?.asObjectOrNull?.get("id")?.asStringOrNull?.let {
                        val (value, claims) = getValueAndClaims(it)
                        callback(value, claims)
                    } to references
                    else -> null to references
                }
            }

        suspend fun JsonElement.readProperty(callback: suspend (String?, JsonElement?) -> String? = { str, _ -> str }): String? =
            coroutineScope {
                val (str, _) = readPropertyReference(callback)
                str
            }

        suspend fun countryOfPlace(place: String?, claims: JsonElement?): String? = coroutineScope {
            val country =
                claims?.asObjectOrNull?.get(Fields.country)?.asArrayOrNull?.get(0)?.readProperty()
            place?.let { p -> country?.let { "$p, $it" } ?: p }
        }

        return coroutineScope {
            try {
                val (name, claims) = getValueAndClaims(id)
                val gender =
                    when (claims?.asObjectOrNull?.get(Fields.gender)?.asArrayOrNull?.get(0)?.asObjectOrNull?.get("mainsnak")?.asObjectOrNull?.get(
                        "datavalue"
                    )
                        ?.asObjectOrNull?.get("value")?.asObjectOrNull?.get("id")
                        ?.toString()) {
                        Fields.female -> 'F'
                        Fields.male -> 'M'
                        else -> run { println(claims?.asObjectOrNull?.get(Fields.gender)); 'U' }
                    }
                val placeOfBirthAsync = async { claims?.asObjectOrNull?.get(Fields.placeOfBirth)?.asArrayOrNull?.get(0)
                    ?.readProperty(::countryOfPlace) }
                val placeOfDeathAsync =
                    async { claims?.asObjectOrNull?.get(Fields.placeOfDeath)?.asArrayOrNull?.get(0)
                        ?.readProperty(::countryOfPlace) }
                val dateOfBirthAsync =
                    async { claims?.asObjectOrNull?.get(Fields.dateOfBirth)?.asArrayOrNull?.get(0)?.readProperty() }
                val dateOfDeathAsync =
                    async { claims?.asObjectOrNull?.get(Fields.dateOfDeath)?.asArrayOrNull?.get(0)?.readProperty() }
                val personalName = "TODO" // TODO
                name?.let {
                    IndividualDTO(
                        id,
                        it,
                        personalName,
                        dateOfBirthAsync?.await(),
                        dateOfDeathAsync?.await(),
                        placeOfBirthAsync?.await(),
                        placeOfDeathAsync?.await(),
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
