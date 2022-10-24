package mmzk.genealogy

import io.ktor.http.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import kotlin.test.*
import io.ktor.server.testing.*
import mmzk.genealogy.plugins.configureRouting

class ApplicationTest {
    @Test
    fun testRoot() = testApplication {
        application {
            configureRouting()
        }
        client.get("/").apply {
            assertEquals(HttpStatusCode.OK, status)
            assertEquals("Hello World!", bodyAsText())
        }
    }

    @Test
    fun `can parse WikiData ID`() {
        val wdID = "WD-Q12"
        val parsed = Fields.parseID(wdID)
        assertEquals(IDType.WIKI_DATA to "Q12", parsed)
    }

    @Test
    fun `can parse Unknown ID`() {
        val wdID = "STH-Q12"
        val parsed = Fields.parseID(wdID)
        assertEquals(null to "Q12", parsed)
    }

    @Test
    fun `cannot parse invalid ID`() {
        val wdID = "_Q12"
        val parsed = Fields.parseID(wdID)
        assertEquals(null, parsed)
    }
}
