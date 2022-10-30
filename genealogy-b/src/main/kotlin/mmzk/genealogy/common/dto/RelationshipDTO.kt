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

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false

        other as RelationshipDTO

        if (item1Id != other.item1Id) return false
        if (item2Id != other.item2Id) return false
        if (typeId != other.typeId) return false

        return true
    }

    override fun hashCode(): Int {
        var result = item1Id.hashCode()
        result = 31 * result + item2Id.hashCode()
        result = 31 * result + typeId.hashCode()
        return result
    }


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
