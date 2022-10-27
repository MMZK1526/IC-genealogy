package mmzk.genealogy.common.dto

import kotlinx.serialization.Serializable
import mmzk.genealogy.common.dao.Relationship

@Serializable
data class RelationshipDTO(
    val item1Id: String,
    val item2Id: String,
    val type: String,
    val typeId: String,
) {
    constructor(dao: Relationship): this(
        dao.item1.id.value,
        dao.item2.id.value,
        dao.type.name,
        dao.type.id.value
    )
}

@Serializable
data class RelationsResponse(
    val targets: List<ItemDTO>,
    val items: List<ItemDTO>,
    val relations: List<RelationshipDTO>
) {
    companion object {
        val empty = RelationsResponse(listOf(), listOf(), listOf())
    }
}
