package mmzk.genealogy.plugins

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import mmzk.genealogy.DatabaseFactory
import mmzk.genealogy.dao.Individual
import mmzk.genealogy.dto.IndividualDTO
import mmzk.genealogy.search.Database
import mmzk.genealogy.search.WikiData
import mmzk.genealogy.tables.IndividualTable
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

        get("/test") {
            WikiData.query("Q9685")?.let { call.respond(it) }
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
                val result = Database.searchId(id, typeFilter)
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

        get("/test") {
            call.request.queryParameters["id"]?.let { id ->
                val typeFilter = call.request.queryParameters["types"]?.split(",")
                val result = WikiData.searchId(id, typeFilter)
                call.respond(result)

            } ?: call.respond(
                HttpStatusCode.BadRequest,
                "error" to "Missing query parameter \"id\"!"
            )
        }
    }
}
