package mmzk.genealogy.plugins

import io.ktor.server.routing.*
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.request.*
import mmzk.genealogy.DatabaseFactory
import mmzk.genealogy.Person
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
                SchemaUtils.create(Person)
                buildString {
                    for (person in Person.selectAll()) {
                        appendLine(
                            "${person[Person.name]} born ${person[Person.dateOfBirth]}, died ${person[Person.dateOfDeath]}, " +
                                    "mother: ${person[Person.mother]}, father: ${person[Person.father]}"
                        )
                    }
                }
            }
            call.respondText(allPeople)
        }
    }
}
