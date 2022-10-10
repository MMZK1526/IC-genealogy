package mmzk.genealogy.plugins

import io.ktor.server.routing.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import mmzk.genealogy.DatabaseFactory
import mmzk.genealogy.Individual
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
                SchemaUtils.create(Individual)
                buildString {
                    for (person in Individual.selectAll()) {
                        appendLine(
                            "${person[Individual.name]} (id: ${person[Individual.id]}), " +
                                    "born ${person[Individual.dateOfBirth]} ${person[Individual.placeOfBirth]}, " +
                                    "died ${person[Individual.dateOfDeath]} ${person[Individual.placeOfDeath]}"
                        )
                    }
                }
            }
            call.respondText(allPeople)
        }
    }
}
