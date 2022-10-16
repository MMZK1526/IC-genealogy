package mmzk.genealogy.search

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.logging.*
import io.ktor.client.request.*
import mmzk.genealogy.dao.Individual
import mmzk.genealogy.dto.IndividualDTO
import mmzk.genealogy.dto.RelationsResponse
import mmzk.genealogy.dto.RelationshipDTO
import com.google.gson.Gson
import io.ktor.client.statement.*
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import mmzk.genealogy.tables.Fields
import org.jetbrains.exposed.sql.transactions.transaction

class WikiData {
    companion object {
        private val client = HttpClient(CIO) {
            install(Logging) {
                level = LogLevel.INFO
            }
        }

        fun mkID(id: String): String = "WD-$id"

        suspend fun query(id: String): IndividualDTO? {
            fun Any.peel2Map(key: String) = if (this is Map<*, *> && this[key] is Map<*, *>) {
                this[key] as Map<*, *>
            } else {
                println(this.javaClass)
                null
            }

            fun Any.peel2Array(key: String) = if (this is Map<*, *> && this[key] is List<*>) {
                this[key] as List<*>
            } else {
                println(this.javaClass)
                null
            }

            suspend fun Any.readPropertyAsync(): Deferred<String?> = coroutineScope {
                val dataValue = this@readPropertyAsync.peel2Map("mainsnak")?.peel2Map("datavalue")
                when (dataValue?.get("type")) {
                    Fields.string -> async { dataValue["value"]?.toString() }
                    Fields.time -> async { dataValue.peel2Map("value")?.get("time")?.toString() }
                    Fields.wikiBaseEntityId -> async {
                        dataValue.peel2Map("value")?.get("id")?.toString()?.let {
                            val url =
                                "https://www.wikidata.org/w/api.php?action=wbgetentities&ids=$it&props=labels&languages=en&formatversion=2&format=json"
                            val response = client.get(url)
                            Gson().fromJson<Map<String, *>>(
                                response.bodyAsText(),
                                Map::class.java
                            ).peel2Map("entities")?.peel2Map(it)?.peel2Map("labels")?.peel2Map("en")?.get("value")
                                .toString()
                        }

                    }
                    else -> async { null }
                }
            }

            return coroutineScope {
                val url =
                    "https://www.wikidata.org/w/api.php?action=wbgetentities&ids=$id&props=labels%7Cclaims&languages=en&formatversion=2&format=json"
                try {
                    val response = client.get(url)
                    val entity = Gson().fromJson<Map<String, *>>(
                        response.bodyAsText(),
                        Map::class.java
                    ).peel2Map("entities")?.peel2Map(id)
                    val name = entity?.peel2Map("labels")?.peel2Map("en")?.get("value").toString()
                    val claims = entity?.peel2Map("claims")
                    val gender =
                        when (claims?.peel2Array(Fields.gender)?.get(0)?.peel2Map("mainsnak")?.peel2Map("datavalue")
                            ?.peel2Map("value")?.get("id")
                            ?.toString()) {
                            Fields.female -> 'F'
                            Fields.male -> 'M'
                            else -> run { println(claims?.peel2Map(Fields.gender)); 'U' }
                        }
                    val placeOfBirthAsync = claims?.peel2Array(Fields.placeOfBirth)?.get(0)?.readPropertyAsync()
                    val placeOfDeathAsync = claims?.peel2Array(Fields.placeOfDeath)?.get(0)?.readPropertyAsync()
                    val dateOfBirthAsync = claims?.peel2Array(Fields.dateOfBirth)?.get(0)?.readPropertyAsync()
                    val dateOfDeathAsync = claims?.peel2Array(Fields.dateOfDeath)?.get(0)?.readPropertyAsync()
                    val personalName = "TODO" // TODO
                    IndividualDTO(
                        id,
                        name,
                        personalName,
                        dateOfBirthAsync?.await(),
                        dateOfDeathAsync?.await(),
                        placeOfBirthAsync?.await(),
                        placeOfDeathAsync?.await(),
                        gender,
                        false
                    )
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
}
