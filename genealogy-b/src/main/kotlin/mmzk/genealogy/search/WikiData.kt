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
    }

    fun makeID(id: String): String = "WD-$id"

    suspend fun query(id: String): IndividualDTO? {
        suspend fun getValueAndClaimsAsync(id: String) = coroutineScope {
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
            async { value to claims }
        }

        suspend fun JsonElement.readPropertyReferenceAsync(callback: suspend (String?, JsonElement?) -> Deferred<String?>): Deferred<Pair<String?, JsonElement?>> =
            coroutineScope {
                val dataValue =
                    this@readPropertyReferenceAsync.asObjectOrNull?.get("mainsnak")?.asObjectOrNull?.get("datavalue")
                val dataValueMap = dataValue?.asObjectOrNull
                val references = this@readPropertyReferenceAsync.asObjectOrNull?.get("references")
                when (dataValueMap?.get("type")?.asStringOrNull) {
                    Fields.string -> async { dataValueMap["value"].asStringOrNull to references }
                    Fields.time -> async { dataValue.asObjectOrNull?.get("value")?.asObjectOrNull?.get("time")?.asStringOrNull to references }
                    Fields.wikiBaseEntityId -> async {
                        dataValue.asObjectOrNull?.get("value")?.asObjectOrNull?.get("id")?.asStringOrNull?.let {
                            val (value, claims) = getValueAndClaimsAsync(it).await()
                            callback(value, claims).await()
                        } to references
                    }
                    else -> async { null to references }
                }
            }

        suspend fun JsonElement.readPropertyReferenceAsync(): Deferred<Pair<String?, JsonElement?>> =
            readPropertyReferenceAsync { str, _ -> coroutineScope { async { str } } }

        suspend fun JsonElement.readPropertyAsync(callback: suspend (String?, JsonElement?) -> Deferred<String?>): Deferred<String?> =
            coroutineScope {
                val (str, _) = readPropertyReferenceAsync(callback).await()
                async { str }
            }

        suspend fun JsonElement.readPropertyAsync() = readPropertyAsync { str, _ -> coroutineScope { async { str } } }

        suspend fun countryOfPlaceAsync(place: String?, claims: JsonElement?): Deferred<String?> = coroutineScope {
            val country =
                claims?.asObjectOrNull?.get(Fields.country)?.asArrayOrNull?.get(0)?.readPropertyAsync()?.await()
            async { place?.let { p -> country?.let { "$p, $it" } ?: p } }
        }

        return coroutineScope {
            try {
                val (name, claims) = getValueAndClaimsAsync(id).await()
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
                val placeOfBirthAsync = claims?.asObjectOrNull?.get(Fields.placeOfBirth)?.asArrayOrNull?.get(0)
                    ?.readPropertyAsync(::countryOfPlaceAsync)
                val placeOfDeathAsync =
                    claims?.asObjectOrNull?.get(Fields.placeOfDeath)?.asArrayOrNull?.get(0)
                        ?.readPropertyAsync(::countryOfPlaceAsync)
                val dateOfBirthAsync =
                    claims?.asObjectOrNull?.get(Fields.dateOfBirth)?.asArrayOrNull?.get(0)?.readPropertyAsync()
                val dateOfDeathAsync =
                    claims?.asObjectOrNull?.get(Fields.dateOfDeath)?.asArrayOrNull?.get(0)?.readPropertyAsync()
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
