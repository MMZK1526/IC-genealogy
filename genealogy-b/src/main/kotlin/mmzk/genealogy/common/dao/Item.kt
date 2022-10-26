package mmzk.genealogy.common.dao

import mmzk.genealogy.common.tables.ItemTable
import mmzk.genealogy.common.tables.StringEntity
import mmzk.genealogy.common.tables.StringEntityClass
import org.jetbrains.exposed.dao.EntityID

class Item(id: EntityID<String>): StringEntity(id) {
    companion object : StringEntityClass<Item>(ItemTable)

    var name by ItemTable.name
    var description by ItemTable.description
    var aliases by ItemTable.aliases
}
