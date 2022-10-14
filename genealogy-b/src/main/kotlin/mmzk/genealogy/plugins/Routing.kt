package mmzk.genealogy.plugins

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import mmzk.genealogy.DatabaseFactory
import mmzk.genealogy.dao.Individual
import mmzk.genealogy.dao.Relationship
import mmzk.genealogy.dto.IndividualDTO
import mmzk.genealogy.dto.RelationsResponse
import mmzk.genealogy.dto.RelationshipDTO
import mmzk.genealogy.tables.IndividualTable
import mmzk.genealogy.tables.RelationshipTable
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction

fun Application.configureRouting() {
    DatabaseFactory.init()
    routing {
        get("/") {
            call.respondText("Hello World!")
        }

        get("/everything") {
            val allPeople = transaction {
                addLogger(StdOutSqlLogger)
                SchemaUtils.create(IndividualTable)
                Individual.all().map(::IndividualDTO)
            }
            call.respond(allPeople)
        }

        get("/search") {
            call.request.queryParameters["q"]?.let { name ->
                val peopleWithMatchedName = transaction {
                    addLogger(StdOutSqlLogger)
                    SchemaUtils.create(IndividualTable)
                    Individual.find { IndividualTable.name.regexp("(?i).*$name.*") }.map(::IndividualDTO)
                }
                call.respond(peopleWithMatchedName)
            } ?: call.respond(
                HttpStatusCode.BadRequest,
                "error" to "Missing query parameter \"q\"!"
            )
        }

        get("/relations") {
            call.request.queryParameters["id"]?.let { id ->
                val typeFilter = call.request.queryParameters["types"]?.split(",")
                val result = transaction TRANS@{
                    val target = Individual.findById(id) ?: return@TRANS null
                    val relationships = if (typeFilter != null && call.request.queryParameters["types"] != "all") {
                        Relationship.find {
                            (RelationshipTable.person1 eq id) or (RelationshipTable.person2 eq id) and
                                    RelationshipTable.type.inList(typeFilter)
                        }
                    } else {
                        Relationship.find {
                            (RelationshipTable.person1 eq id) or (RelationshipTable.person2 eq id)
                        }
                    }
                    val individuals = relationships.map {
                        IndividualDTO(
                            if (it.person1.id.value == id) {
                                it.person2
                            } else {
                                it.person1
                            }
                        )
                    }
                    RelationsResponse(
                        target = IndividualDTO(target),
                        people = individuals,
                        relations = relationships.map(::RelationshipDTO)
                    )
                }
                if (result != null) {
                    call.respond(result)
                } else {
                    call.respond(HttpStatusCode.BadRequest, "error" to "Person with id $id not found!")
                }

            } ?: call.respond(
                HttpStatusCode.BadRequest,
                "error" to "Missing query parameter \"id\"!"
            )
        }
    }
}
