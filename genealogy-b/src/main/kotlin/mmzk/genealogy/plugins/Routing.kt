package mmzk.genealogy.plugins

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.receive
import io.ktor.server.response.*
import io.ktor.server.routing.*
import mmzk.genealogy.Fields
import mmzk.genealogy.common.Database
import mmzk.genealogy.WikiDataDataSource
import mmzk.genealogy.common.RelationCalculatorRequest
import mmzk.genealogy.common.calculateRelations

fun Application.configureRouting() {
    Database.init()
    routing {

        // The API endpoint for searching a name fragment. It will return results from both the database and WikiData,
        // using an order of relevance.
        //
        // Params:
        // q: Finds items whose name contains q
        // Response:
        // id: The ID of the item in the database
        // name: The name of the item, usually from WikiData
        // description: A one-liner description of the item, usually from WikiData
        // additionalProperties: A list of JSON objects representing the properties of this item
        get("/search") {
            call.request.queryParameters["q"]?.let { name ->
//                val searchedItems = WikiDataDataSource(listOf()).searchIndividualByName(name) // Search in WikiData
//                Database.insertItems(searchedItems) // Put new results in database (pre-existing ones are ignored)
                val matchedItemsInDB = Database.findItemByName(name) // Fetch items with matching names
                call.respond(matchedItemsInDB)
            } ?: call.respond(
                HttpStatusCode.BadRequest,
                mapOf("error" to "Missing query parameter \"q\"!")
            )
        }

        get("/relations_wk") {
            val depth = call.request.queryParameters["depth"]?.toIntOrNull() ?: 0

            call.request.queryParameters["id"]?.let { id ->
                val typeFilter =
                    call.request.queryParameters["types"]?.split(",") ?: listOf("WD-P22", "WD-P25", "WD-P26", "WD-P40")
                val result = WikiDataDataSource(listOf()).findRelatedPeople(id, typeFilter, depth)
                call.respond(result)
            } ?: call.respond(
                HttpStatusCode.BadRequest,
                mapOf("error" to "Missing query parameter \"q\"!")
            )
        }

        get("/relations_db") {
            val depth = call.request.queryParameters["depth"]?.toIntOrNull() ?: 0

            call.request.queryParameters["id"]?.let { id ->
                val typeFilter =
                    call.request.queryParameters["types"]?.split(",") ?: listOf("WD-P22", "WD-P25", "WD-P26", "WD-P40")
                val result = Database.findRelatedItems(id, typeFilter, depth)
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
