package mmzk.genealogy.common.dao

import mmzk.genealogy.common.tables.PropertyTypeTable
import mmzk.genealogy.common.tables.StringEntity
import mmzk.genealogy.common.tables.StringEntityClass
import org.jetbrains.exposed.dao.EntityID

class PropertyType(id: EntityID<String>): StringEntity(id) {
    companion object : StringEntityClass<PropertyType>(PropertyTypeTable)

    var name by PropertyTypeTable.name
}