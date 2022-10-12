package mmzk.genealogy.tables

import org.jetbrains.exposed.dao.IntIdTable

object IndividualTable : IntIdTable() {
    val name = varchar("name", 255)
    val dateOfBirth = date("date_of_birth").nullable()
    val dateOfDeath = date("date_of_death").nullable()
    val placeOfBirth = varchar("place_of_birth", 255).nullable()
    val placeOfDeath = varchar("place_of_death", 255).nullable()
    val gender = char("gender") // 'M' or 'F'
}
