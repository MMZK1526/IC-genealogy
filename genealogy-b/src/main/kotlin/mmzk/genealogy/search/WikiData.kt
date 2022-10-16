package mmzk.genealogy.search

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.logging.*
import io.ktor.client.request.*
import kotlinx.coroutines.runBlocking
import mmzk.genealogy.dao.Individual
import mmzk.genealogy.dto.IndividualDTO
import mmzk.genealogy.dto.RelationsResponse
import mmzk.genealogy.dto.RelationshipDTO
import org.jetbrains.exposed.sql.transactions.transaction

class WikiData {
    companion object {
        fun mkID(id: String): String = "WD-$id"

        fun query(id: String) {
            runBlocking {
                val client = HttpClient(CIO) {
                    install(Logging) {
                        level = LogLevel.INFO
                    }
                }

                client.get("https://ktor.io/docs/welcome.html")
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

                                    frontier.add(curDepth + 1 to p.id )
                                    reverseRelatives[p.id]?.add(it.target.id)
                                        ?: run { reverseRelatives[p.id] = mutableSetOf(it.target.id) }
                                }
                                relativeCountMap[it.target.id] = newPeople.size
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
