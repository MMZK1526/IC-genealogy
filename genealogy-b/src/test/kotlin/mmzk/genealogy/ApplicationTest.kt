package mmzk.genealogy

import io.ktor.http.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import kotlin.test.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.*

class ApplicationTest {
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

    @Test
    fun `depth 0 only has self and spouse as result`() = testApplication {
        val client = createClient {}
        client.post("/relations_db?depth=0&id=WD-Q9682") {
            contentType(ContentType.Application.Json)
            setBody("[]")
        }.apply {
            assertEquals(HttpStatusCode.OK, status)
            assertEquals(2, Json.parseToJsonElement(bodyAsText()).jsonObject["items"]?.jsonObject?.keys?.size)
        }
    }

    @Test
    fun `depth 2 for QEII contains Mary of Teck but not Edward VIII`() = testApplication {
        val client = createClient {}
        client.post("/relations_db?depth=2&id=WD-Q9682") {
            contentType(ContentType.Application.Json)
            setBody("[]")
        }.apply {
            assertEquals(HttpStatusCode.OK, status)
            assertTrue(
                Json.parseToJsonElement(bodyAsText()).jsonObject["items"]?.jsonObject?.containsKey("WD-Q76927") ?: false
            )
            assertFalse(
                Json.parseToJsonElement(bodyAsText()).jsonObject["items"]?.jsonObject?.containsKey("WD-Q20875") ?: true
            )
        }
    }
}
