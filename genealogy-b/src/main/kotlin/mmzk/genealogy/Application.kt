package mmzk.genealogy

import io.ktor.serialization.kotlinx.json.json
import mmzk.genealogy.plugins.configureRouting
import io.ktor.server.application.*
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import mmzk.genealogy.plugins.configureHTTP

fun main(args: Array<String>): Unit =
    io.ktor.server.netty.EngineMain.main(args)

@Suppress("unused") // application.conf references the main function. This annotation prevents the IDE from marking it as unused.
fun Application.module() {
    configureHTTP()
    configureRouting()
    install(ContentNegotiation) {
        json()
    }
}
