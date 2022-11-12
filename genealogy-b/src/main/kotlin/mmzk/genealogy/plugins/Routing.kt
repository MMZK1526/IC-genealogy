package mmzk.genealogy.plugins

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.receive
import io.ktor.server.response.*
import io.ktor.server.routing.*
import mmzk.genealogy.common.Database
import mmzk.genealogy.WikiDataDataSource
import mmzk.genealogy.common.RelationCalculatorRequest
import mmzk.genealogy.common.calculateRelations

fun Application.configureRouting() {
    Database.init()
    routing {
        get("/search") {
            call.request.queryParameters["q"]?.let { name ->
                val searchedItems = WikiDataDataSource().searchIndividualByName(name) // Search in WikiData
                Database.insertItems(searchedItems) // Put new results in database (pre-existing ones are ignored)
                val matchedItemsInDB = Database.findItemByName(name) // Fetch items with matching names
                call.respond(matchedItemsInDB)
            } ?: call.respond(
                HttpStatusCode.BadRequest,
                mapOf("error" to "Missing query parameter \"q\"!")
            )
        }

        post("/relations_wk") {
            val depth = call.request.queryParameters["depth"]?.toIntOrNull() ?: 0
            val visitedItems = call.receive<List<String>>()
            call.request.queryParameters["id"]?.let { id ->
                val homoStrata =
                    call.request.queryParameters["homo_strata"]?.split(",") ?: listOf("WD-P26")
                val heteroStrata =
                    call.request.queryParameters["hetero_strata"]?.split(",") ?: listOf("WD-P22", "WD-P25", "WD-P40")
                val result = WikiDataDataSource(homoStrata, heteroStrata).findRelatedPeople(id, visitedItems, depth)
                call.respond(result)
//                Database.insertItems(result.items.values.toList())
//                Database.insertRelations(result.relations.values.flatten())
            } ?: call.respond(
                HttpStatusCode.BadRequest,
                mapOf("error" to "Missing query parameter \"q\"!")
            )
        }

        post("/relations_db") {
            val depth = call.request.queryParameters["depth"]?.toIntOrNull() ?: 0
            val visitedItems = call.receive<List<String>>()
            call.request.queryParameters["id"]?.let { id ->
                val homoStrata =
                    call.request.queryParameters["homo_strata"]?.split(",") ?: listOf("WD-P26")
                val heteroStrata =
                    call.request.queryParameters["hetero_strata"]?.split(",") ?: listOf("WD-P22", "WD-P25", "WD-P40")
                val result = Database.findRelatedItems(id, homoStrata.toSet(), heteroStrata.toSet(), depth, visitedItems.toMutableSet())
                call.respond(result)
            } ?: call.respond(
                HttpStatusCode.BadRequest,
                mapOf("error" to "Missing query parameter \"q\"!")
            )
        }

        post("/relation_calc") {
            val request = call.receive<RelationCalculatorRequest>()
            call.respond(calculateRelations(request))
        }
    }
}
