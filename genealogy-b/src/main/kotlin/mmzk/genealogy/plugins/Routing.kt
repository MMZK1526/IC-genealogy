package mmzk.genealogy.plugins

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.async
import mmzk.genealogy.common.dao.Item
import mmzk.genealogy.common.dto.ItemDTO
import mmzk.genealogy.common.Database
import mmzk.genealogy.WikiDataDataSource
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction

fun Application.configureRouting() {
    Database.init()
    routing {

        get("/search") {
            call.request.queryParameters["q"]?.let { name ->
//                val matchedNamesInDBAsync = async { Database.findItemByName(name) }
                val searchedNames = WikiDataDataSource(listOf()).searchIndividualByName(name)
//                val matchedNamesInDB = matchedNamesInDBAsync.await()
//                val matchedIDsInDB = matchedNamesInDB.map { it.id }.toSet()
//                val newNames = mutableListOf<ItemDTO>()
//
//                for (n in searchedNames) {
//                    if (!matchedIDsInDB.contains(n.id)) {
//                        newNames.add(n)
//                    }
//                }
//
//                newNames.addAll(matchedNamesInDB)
                call.respond(searchedNames)
            } ?: call.respond(
                HttpStatusCode.BadRequest,
                mapOf("error" to "Missing query parameter \"q\"!")
            )
        }

        get("/relations_wk") {
            val depth = call.request.queryParameters["depth"]?.toIntOrNull() ?: 0

            call.request.queryParameters["id"]?.let { id ->
                val typeFilter = call.request.queryParameters["types"]?.split(",") ?: listOf("WD-P22", "WD-P25", "WD-P26", "WD-P40")
                val result = WikiDataDataSource(listOf()).findRelatedPeople(id, typeFilter, depth)
                call.respond(result)
            } ?: call.respond(
                HttpStatusCode.BadRequest,
                mapOf("error" to "Missing query parameter \"q\"!")
            )
        }

        get("/relations_db") {
            // TODO: depth
//            val depth = call.request.queryParameters["depth"]?.toIntOrNull() ?: 0

            call.request.queryParameters["id"]?.let { id ->
                val typeFilter = call.request.queryParameters["types"]?.split(",") ?: listOf("WD-P22", "WD-P25", "WD-P26", "WD-P40")
                val result = Database.findRelatedItems(id, typeFilter)
                call.respond(result)
            } ?: call.respond(
                HttpStatusCode.BadRequest,
                mapOf("error" to "Missing query parameter \"q\"!")
            )
        }
    }
}
