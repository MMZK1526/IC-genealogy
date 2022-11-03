package mmzk.genealogy.common.dto

import kotlinx.serialization.Serializable
import mmzk.genealogy.common.dao.Item

@Serializable
data class ItemDTO(
    var id: String,
    var name: String,
    var description: String,
    var aliases: String?,
    var additionalProperties: Set<AdditionalPropertyDTO> = setOf()
) {
    constructor(dao: Item, additionalProperties: Set<AdditionalPropertyDTO> = setOf()) : this(
        dao.id.value,
        dao.name,
        dao.description,
        dao.aliases,
        additionalProperties
    )
}
