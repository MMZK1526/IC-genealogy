package mmzk.genealogy.plugins

import io.ktor.server.routing.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import mmzk.genealogy.DatabaseFactory
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
                buildString {
                    for (person in Individual.all()) {
                        appendLine(
                            "${person.name} (id: ${person.id}), " +
                                    "born ${person.dateOfBirth} ${person.placeOfBirth}, " +
                                    "died ${person.dateOfDeath} ${person.placeOfDeath}"
                        )
                    }
                }
            }
            call.respondText(allPeople)
        }
    }
}
