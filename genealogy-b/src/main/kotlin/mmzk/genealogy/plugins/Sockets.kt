package mmzk.genealogy.plugins

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import mmzk.genealogy.Connection
import io.ktor.server.response.*
import mmzk.genealogy.WikiDataDataSource
import mmzk.genealogy.common.Database
import mmzk.genealogy.common.RelationCalculatorRequest
import mmzk.genealogy.common.calculateRelations
import io.ktor.serialization.kotlinx.*
import io.ktor.server.application.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.utils.io.core.*
import io.ktor.websocket.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import mmzk.genealogy.common.dto.RelationsResponse
import java.time.Duration
import java.util.*

@Serializable
data class RelationsWkRequest(
    val requestId: ULong,
    val id: String,
    val depth: Int = 0,
    val homoStrata: String?,
    val heteroStrata: String?,
    val visitedItems: List<String>,
    val ping: String?,
    )

@Serializable
data class RelationsWkResponse(
    val requestId: ULong,
    val response: RelationsResponse?,
)

@Serializable
data class ErrorMessage(
    val statusCode: Int,
    val message: String,
)

fun Application.configureSockets() {
    install(WebSockets) {
//        pingPeriod = Duration.ofSeconds(15)
        pingPeriod = null
        timeout = Duration.ofSeconds(20)
        maxFrameSize = Long.MAX_VALUE
        masking = false
        contentConverter = KotlinxWebsocketSerializationConverter(Json)
    }
    routing {
        val connections = Collections.synchronizedSet<Connection?>(LinkedHashSet())
        webSocket("/relations_wk") {
            val thisConnection = Connection(this)
            connections += thisConnection
            try {
                for (frame in incoming) {
                    frame as? Frame.Text ?: continue
                    val receivedText = frame.readText()
                    println(receivedText)
                    val relationsWkRequest = Json
                        .decodeFromString<RelationsWkRequest>(receivedText)
                    val requestId = relationsWkRequest.requestId
                    val ping = relationsWkRequest.ping
                    if (ping != null && ping == "ping") {
                        println("Ping received")
                        val response = RelationsWkResponse(
                            requestId = requestId,
                            response = null,
                        )
                        sendSerialized(response)
                        continue
                    }
                    val depth = relationsWkRequest.depth
                    val visitedItems = relationsWkRequest.visitedItems
                    relationsWkRequest.id.let { id ->
                        val homoStrata =
                            relationsWkRequest.homoStrata?.split(",")
                                ?: listOf("WD-P26")
                        val heteroStrata =
                            relationsWkRequest.heteroStrata?.split(",")
                                ?: listOf("WD-P22", "WD-P25", "WD-P40")
                        val result = WikiDataDataSource(homoStrata, heteroStrata).findRelatedPeople(id, visitedItems, depth)
                        val response = RelationsWkResponse(
                            requestId = requestId,
                            response = result,
                        )
                        sendSerialized(response)
                        Database.insertItems(result.items.values.toList())
                        Database.insertRelations(result.relations.values.flatten())
                    }
                }
            } catch (e: Exception) {
                println(e.localizedMessage)
                val errorMessage = ErrorMessage(
                    statusCode = 1003,
                    message = mapOf("error" to
                            "Missing query parameter \"q\"!").toString()
                )
                sendSerialized(errorMessage)
            } finally {
                println("Removing $thisConnection!")
                connections -= thisConnection
            }

        }
    }
}
