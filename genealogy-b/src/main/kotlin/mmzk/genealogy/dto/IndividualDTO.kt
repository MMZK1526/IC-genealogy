package mmzk.genealogy.dto

import kotlinx.serialization.Serializable
import mmzk.genealogy.dao.Individual

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
) {
    constructor(x: Individual): this(
        x.id.value,
        x.name,
        x.personalName,
        x.dateOfBirth?.toLocalDate().toString(),
        x.dateOfDeath?.toLocalDate().toString(),
        x.placeOfBirth,
        x.placeOfDeath,
        x.gender
    )
}
