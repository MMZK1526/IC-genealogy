package mmzk.genealogy.common.dto

import kotlinx.serialization.Serializable
import mmzk.genealogy.common.dao.Item
import mmzk.genealogy.common.tables.AdditionalPropertiesTable
import mmzk.genealogy.common.tables.PropertyTypeTable
import org.jetbrains.exposed.sql.ResultRow

@Serializable
data class ItemDTO(
    var id: String,
    var name: String,
    var description: String,
    var aliases: String?,
    var additionalProperties: List<AdditionalProperty> = listOf()
) {
    constructor(dao: Item, additionalProperties: List<AdditionalProperty> = listOf()) : this(
        dao.id.value,
        dao.name,
        dao.description,
        dao.aliases,
        additionalProperties
    )
}

@Serializable
data class AdditionalProperty(
    var propertyId: String,
    var name: String,
    var value: String,
    val valueHash: String,
) {
    constructor(row: ResultRow) : this(
        row[AdditionalPropertiesTable.propertyId],
        row[PropertyTypeTable.name],
        row[AdditionalPropertiesTable.value],
        row[AdditionalPropertiesTable.valueHash]
    )
}
