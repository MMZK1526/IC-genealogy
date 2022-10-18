package mmzk.genealogy.dto

import kotlinx.serialization.KSerializer
import kotlinx.serialization.Serializable
import kotlinx.serialization.descriptors.*
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import mmzk.genealogy.dao.Individual
import mmzk.genealogy.tables.AdditionalPropertiesTable
import org.jetbrains.exposed.sql.ResultRow

@Serializable
data class IndividualDTO(
    var id: String,
    var name: String,
    var personalName: String,
    var dateOfBirth: String?,
    var dateOfDeath: String?,
    var placeOfBirth: String?,
    var placeOfDeath: String?,
    var gender: Char,
    var isCached: Boolean = false,
    var additionalProperties: List<AdditionalProperty> = listOf()
) {
    constructor(dao: Individual, additionalProperties: List<AdditionalProperty> = listOf()) : this(
        dao.id.value,
        dao.name,
        dao.personalName,
        dao.dateOfBirth?.toLocalDate().toString(),
        dao.dateOfDeath?.toLocalDate().toString(),
        dao.placeOfBirth,
        dao.placeOfDeath,
        dao.gender,
        dao.isCached,
        additionalProperties
    )
}

class IndividualName(
    val givenNames: MutableMap<Int, String> = mutableMapOf(),
    var maidenName: String? = null,
    var marriageName: String? = null,
) {

    val fullName: String?
        get() {
            val givenName = if (givenNames.containsKey(0) && givenNames.size == 1) {
                givenNames[0]
            } else if (givenNames.isNotEmpty()) {
                givenNames.remove(0)
                givenNames.entries.toList().sortedBy { it.key }.joinToString(" ") { it.value }
            } else {
                null
            }
            val fullName = marriageName?.let { fn -> givenName?.let { gn -> "$fn, $gn" } ?: fn } ?: givenName
            return fullName?.let { fn -> maidenName?.let { mn -> "$fn, née $mn" } ?: fn } ?: maidenName?.let { "née $it" }
        }
}

@Serializable
data class AdditionalProperty(
    var name: String,
    var value: ByteArray?,
    var type: String,
) {
    constructor(row: ResultRow) : this(
        row[AdditionalPropertiesTable.propertyName],
        row[AdditionalPropertiesTable.value]?.let { it.getBytes(0, it.length().toInt()) },
        row[AdditionalPropertiesTable.type]
    )
}

@Serializable
data class AdditionalProperty(
    var name: String,
    var value: ByteArray?,
    var type: String,
) {
    constructor(row: ResultRow): this(
        row[AdditionalPropertiesTable.propertyName],
        row[AdditionalPropertiesTable.value]?.let { it.getBytes(0, it.length().toInt()) },
        row[AdditionalPropertiesTable.type]
    )
}