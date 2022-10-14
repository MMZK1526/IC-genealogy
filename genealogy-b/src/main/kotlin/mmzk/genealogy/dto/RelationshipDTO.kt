package mmzk.genealogy.dto

import kotlinx.serialization.Serializable
import mmzk.genealogy.dao.Relationship

@Serializable
data class RelationshipDTO(
    val person1Id: String,
    val person2Id: String,
    val type: String,
    val typeId: String,
) {
    constructor(dao: Relationship): this(
        dao.person1.id.value,
        dao.person2.id.value,
        dao.type.name,
        dao.type.id.value
    )
}

@Serializable
data class RelationsResponse(
    val target: IndividualDTO,
    val people: List<IndividualDTO>,
    val relations: List<RelationshipDTO>
)