package mmzk.genealogy.plugins

import io.ktor.server.application.*
import io.ktor.serialization.kotlinx.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.*
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import mmzk.genealogy.*
import mmzk.genealogy.common.Database
import java.time.Duration
import java.util.*
import kotlin.random.Random

const val WRITE_TO_DB = true;

fun Application.configureSockets() {
    install(WebSockets) {
        pingPeriod = null
        timeout = Duration.ofSeconds(20)
        maxFrameSize = Long.MAX_VALUE
        masking = false
        contentConverter = KotlinxWebsocketSerializationConverter(Json)
    }
    routing {
        val connections =
            Collections.synchronizedSet<Connection?>(LinkedHashSet())
        webSocket("/relations_wk_ws") {
            val thisConnection = Connection(this)
            connections += thisConnection
            try {
                for (frame in incoming) {
                    val tAll = CustomTimer("All")
                    val tPing = CustomTimer("Ping")
                    frame as? Frame.Text ?: continue
                    val receivedText = frame.readText()
                    val relationsWkRequest =
                        Json.decodeFromString<RelationsWkRequest>(receivedText)
                    val requestId = relationsWkRequest.requestId
                    val ping = relationsWkRequest.ping
                    if (ping != null && ping == "ping") {
                        val response = RelationsWkResponse(
                            requestId = requestId,
                            response = null,
                        )
                        sendSerialized(response)
                        tPing.end()
                        continue
                    }
                    println(receivedText)
                    val depth = relationsWkRequest.depth
                    val visitedItems = relationsWkRequest.visitedItems
                    relationsWkRequest.id.let { id ->
                        val homoStrata =
                            relationsWkRequest.homoStrata?.split(",") ?: listOf(
                                "WD-P26"
                            )
                        val heteroStrata =
                            relationsWkRequest.heteroStrata?.split(",")
                                ?: listOf("WD-P22", "WD-P25", "WD-P40")
                        val tWiki = CustomTimer("Wiki fetch")
                        val result = WikiDataDataSource(
                            homoStrata,
                            heteroStrata
                        ).findRelatedPeople(id, visitedItems, depth)
                        tWiki.end()
                        val response = RelationsWkResponse(
                            requestId = requestId,
                            response = result,
                        )
                        sendSerialized(response)
                        tAll.end()
                        if (WRITE_TO_DB) {
                            launch(Dispatchers.IO) {
                                val tDb = CustomTimer("Database writing")
                                Database.insertItems(result.items.values.toList())
                                Database.insertRelations(result.relations.values.flatten())
                                tDb.end()
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                println(e.localizedMessage)
                val errorMessage = ErrorMessage(
                    statusCode = 1003, message = mapOf(
                        "error" to "Missing query parameter \"q\"!"
                    ).toString()
                )
                sendSerialized(errorMessage)
            } finally {
                println("Removing $thisConnection!")
                connections -= thisConnection
            }
        }
        webSocket("/relations_db_ws") {
            val thisConnection = Connection(this)
            connections += thisConnection
            try {
                for (frame in incoming) {
                    val tAll = CustomTimer("All")
                    val tPing = CustomTimer("Ping")
                    frame as? Frame.Text ?: continue
                    val receivedText = frame.readText()
                    val relationsWkRequest =
                        Json.decodeFromString<RelationsWkRequest>(receivedText)
                    val requestId = relationsWkRequest.requestId
                    val ping = relationsWkRequest.ping
                    if (ping != null && ping == "ping") {
                        val response = RelationsWkResponse(
                            requestId = requestId,
                            response = null,
                        )
                        sendSerialized(response)
                        tPing.end()
                        continue
                    }
                    println(receivedText)
                    val depth = relationsWkRequest.depth
                    val visitedItems = relationsWkRequest.visitedItems
                    relationsWkRequest.id.let { id ->
                        val homoStrata =
                            relationsWkRequest.homoStrata?.split(",") ?: listOf(
                                "WD-P26"
                            )
                        val heteroStrata =
                            relationsWkRequest.heteroStrata?.split(",")
                                ?: listOf("WD-P22", "WD-P25", "WD-P40")
                        val tWiki = CustomTimer("Wiki fetch")
                        val result = Database.findRelatedItems(id, homoStrata.toSet(), heteroStrata.toSet(), depth, visitedItems.toMutableSet())
                        tWiki.end()
                        val response = RelationsWkResponse(
                            requestId = requestId,
                            response = result,
                        )
                        sendSerialized(response)
                        tAll.end()
                        if (WRITE_TO_DB) {
                            launch(Dispatchers.IO) {
                                val tDb = CustomTimer("Database writing")
                                Database.insertItems(result.items.values.toList())
                                Database.insertRelations(result.relations.values.flatten())
                                tDb.end()
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                println(e.localizedMessage)
                val errorMessage = ErrorMessage(
                    statusCode = 1003, message = mapOf(
                        "error" to "Missing query parameter \"q\"!"
                    ).toString()
                )
                sendSerialized(errorMessage)
            } finally {
                println("Removing $thisConnection!")
                connections -= thisConnection
            }
        }
    }
}
