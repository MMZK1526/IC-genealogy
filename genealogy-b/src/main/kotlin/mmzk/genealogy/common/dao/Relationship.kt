package mmzk.genealogy.common.dao

import mmzk.genealogy.common.tables.*
import org.jetbrains.exposed.dao.EntityID
import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass

class Relationship(id: EntityID<Int>): IntEntity(id) {
    companion object : IntEntityClass<Relationship>(RelationshipTable)

    var item1 by Item referencedOn RelationshipTable.item1
    var item2 by Item referencedOn RelationshipTable.item2
    var type by PropertyType referencedOn RelationshipTable.type
}

