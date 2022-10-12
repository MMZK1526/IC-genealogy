package mmzk.genealogy.plugins

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
                buildList {
                    for (person in Individual.all()) {
                        add(IndividualDTO(person))
                    }
                }
            }
            call.respond(allPeople)
        }
    }
}
