package mmzk.genealogy.plugins

import io.ktor.http.*
import io.ktor.server.routing.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import mmzk.genealogy.DatabaseFactory
import mmzk.genealogy.dto.IndividualDTO
import mmzk.genealogy.dao.Individual
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
    }
}
