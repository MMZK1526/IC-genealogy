package mmzk.genealogy.dao

import mmzk.genealogy.tables.IndividualTable
import mmzk.genealogy.tables.RelationshipTable
import mmzk.genealogy.tables.RelationshipTypeTable
import org.jetbrains.exposed.dao.EntityID
import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass

class Relationship(id: EntityID<Int>): IntEntity(id) {
    companion object : IntEntityClass<Relationship>(RelationshipTable)

    var person1 by Individual referencedOn RelationshipTable.person1
    var person2 by Individual referencedOn RelationshipTable.person2
    var type by RelationshipType referencedOn RelationshipTable.type
}

class RelationshipType(id: EntityID<Int>): IntEntity(id) {
    companion object : IntEntityClass<RelationshipType>(RelationshipTypeTable)

    var name by RelationshipTypeTable.name
}