package mmzk.genealogy.plugins

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.async
import mmzk.genealogy.dao.Individual
import mmzk.genealogy.dto.IndividualDTO
import mmzk.genealogy.search.Database
import mmzk.genealogy.search.WikiData
import mmzk.genealogy.tables.IndividualTable
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction

fun Application.configureRouting() {
    Database.init()
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
            call.respond(WikiData.query(listOf("Q9685", "Q9682", "Q5")))
        }

        get("/search") {
            call.request.queryParameters["q"]?.let { name ->
                val matchedNamesInDBAsync = async { Database.findPersonByName(name) }
                val searchedID = WikiData.searchName(name) ?: listOf()
                val searchedNames = WikiData.query(searchedID)
                println(searchedID)
                println(searchedNames)
                val matchedNamesInDB = matchedNamesInDBAsync.await()
                val matchedIDsInDB = matchedNamesInDB.map { it.id }.toSet()
                val newNames = mutableListOf<IndividualDTO>()

                for (n in searchedNames) {
                    if (!matchedIDsInDB.contains(n.id)) {
                        newNames.add(n)
                    }
                }

                newNames.addAll(matchedNamesInDB)
                call.respond(newNames)
            } ?: call.respond(
                HttpStatusCode.BadRequest,
                mapOf("error" to "Missing query parameter \"q\"!")
            )
        }

        get("/relations") {
            call.request.queryParameters["id"]?.let { id ->
                val typeFilter = call.request.queryParameters["types"]?.split(",")
                val result = Database.findRelatedPeople(id, typeFilter)
                call.respond(result)
            } ?: call.respond(
                HttpStatusCode.BadRequest,
                mapOf("error" to "Missing query parameter \"q\"!")
            )
        }
    }
}
