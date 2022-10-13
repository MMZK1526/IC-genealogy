package mmzk.genealogy.dao

import mmzk.genealogy.tables.IndividualTable
import mmzk.genealogy.tables.StringEntity
import mmzk.genealogy.tables.StringEntityClass
import org.jetbrains.exposed.dao.EntityID

class Individual(id: EntityID<String>): StringEntity(id) {
    companion object : StringEntityClass<Individual>(IndividualTable)

    var name by IndividualTable.name
    var personalName by IndividualTable.personalName
    var dateOfBirth by IndividualTable.dateOfBirth
    var dateOfDeath by IndividualTable.dateOfDeath
    var placeOfBirth by IndividualTable.placeOfBirth
    var placeOfDeath by IndividualTable.placeOfDeath
    var gender by IndividualTable.gender
}
