package mmzk.genealogy.dao

import mmzk.genealogy.tables.IndividualTable
import org.jetbrains.exposed.dao.EntityID
import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass

class Individual(id: EntityID<Int>): IntEntity(id) {
    companion object : IntEntityClass<Individual>(IndividualTable)

    var name by IndividualTable.name
    var dateOfBirth by IndividualTable.dateOfBirth
    var dateOfDeath by IndividualTable.dateOfDeath
    var placeOfBirth by IndividualTable.placeOfBirth
    var placeOfDeath by IndividualTable.placeOfDeath
    var gender by IndividualTable.gender
}
