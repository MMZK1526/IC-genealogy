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
    var isCached: Boolean,
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