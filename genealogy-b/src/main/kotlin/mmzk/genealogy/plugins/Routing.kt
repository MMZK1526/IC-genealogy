package mmzk.genealogy.plugins

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
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

        get("/search") {
            call.request.queryParameters["q"]?.let { name ->
//                val matchedNamesInDBAsync = async { Database.findPersonByName(name) }
                val searchedNames =  WikiData.searchIndividualByName(name)
                println(searchedNames)
//                val matchedNamesInDB = matchedNamesInDBAsync.await()
//                val matchedIDsInDB = matchedNamesInDB.map { it.id }.toSet()
//                val newNames = mutableListOf<IndividualDTO>()
//
//                for (n in searchedNames) {
//                    if (!matchedIDsInDB.contains(n.id)) {
//                        newNames.add(n)
//                    }
//                }

//                newNames.addAll(matchedNamesInDB)
                call.respond(searchedNames)
            } ?: call.respond(
                HttpStatusCode.BadRequest,
                mapOf("error" to "Missing query parameter \"q\"!")
            )
        }

        get("/relations") {
            call.request.queryParameters["id"]?.let { id ->
                val typeFilter = call.request.queryParameters["types"]?.split(",")
                val result = WikiData.findRelatedPeople(id, typeFilter, 2)
                call.respond(result)
            } ?: call.respond(
                HttpStatusCode.BadRequest,
                mapOf("error" to "Missing query parameter \"q\"!")
            )
        }

        get("test") {
            call.respond(WikiData.searchIndividualByIDs(listOf("Q9682", "Q9685")))
        }
    }
}
