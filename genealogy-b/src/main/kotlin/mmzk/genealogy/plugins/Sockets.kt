package mmzk.genealogy.plugins

import io.ktor.server.application.*
import io.ktor.serialization.kotlinx.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.websocket.*
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.ReceiveChannel
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import mmzk.genealogy.*
import mmzk.genealogy.common.Database
import java.time.Duration
import java.util.*

const val WRITE_TO_DB = false

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
        webSocket("/relations_ws") {
            val thisConnection = Connection(this)
            connections += thisConnection
            try {
                for (frame in incoming) {
                    launch {
                        val tPing = CustomTimer("Ping")
                        if (frame !is Frame.Text) return@launch
                        val receivedText = frame.readText()
                        val relationsWkRequest =
                            Json.decodeFromString<RelationsWkRequest>(
                                receivedText
                            )
                        val endpoint = relationsWkRequest.endpoint
                        val useWikiData = endpoint == "wk"
                        val requestId = relationsWkRequest.requestId
                        if (endpoint == "ping") {
                            val response = RelationsWkResponse(
                                requestId = requestId,
                                response = null,
                            )
                            sendSerialized(response)
                            tPing.end()
                            return@launch
                        }
//                        println(receivedText)
                        val depth = relationsWkRequest.depth
                        val visitedItems = relationsWkRequest.visitedItems
                        println("Endpoint $endpoint, depth $depth")
                        println("Visited items length: ${visitedItems.size}")
                        relationsWkRequest.id.let { id ->
                            val homoStrata =
                                relationsWkRequest.homoStrata?.split(",")
                                    ?: listOf(
                                        "WD-P26"
                                    )
                            val heteroStrata =
                                relationsWkRequest.heteroStrata?.split(",")
                                    ?: listOf("WD-P22", "WD-P25", "WD-P40")
                            val title =
                                if (useWikiData) "Wiki fetch and send" else "Db query and send"
                            val tFetch = CustomTimer(title)
                            val result = if (useWikiData) WikiDataDataSource(
                                homoStrata, heteroStrata
                            ).findRelatedPeople(
                                id, visitedItems, depth
                            ) else Database.findRelatedItems(
                                id,
                                homoStrata.toSet(),
                                heteroStrata.toSet(),
                                depth,
                                visitedItems.toMutableSet()
                            )
//                            val result = WikiDataDataSource(
//                                homoStrata, heteroStrata
//                            ).findRelatedPeople(
//                                id, visitedItems, depth
//                            )
                            val response = RelationsWkResponse(
                                requestId = requestId,
                                response = result,
                            )
                            sendSerialized(response)
                            flush()
//                            println("Incoming: $incoming")
//                            println("Outgoing: $outgoing")
                            tFetch.end()
                            if (WRITE_TO_DB && useWikiData) {
                                launch(Dispatchers.IO) {
                                    val tDb = CustomTimer("Database writing")
                                    Database.insertItems(result.items.values.toList())
                                    Database.insertRelations(result.relations.values.flatten())
                                    tDb.end()
                                }
                            }
                        }
                    }
                }
                println("After for loop")
            } catch (e: Exception) {
                println(e)
            } finally {
                println("Removing $thisConnection!")
                connections -= thisConnection
            }
        }
    }
}
