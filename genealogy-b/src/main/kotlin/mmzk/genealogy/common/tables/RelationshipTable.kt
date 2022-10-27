package mmzk.genealogy.common.tables

import org.jetbrains.exposed.dao.IntIdTable
object RelationshipTable : IntIdTable() {
    val item1 = reference("item1", ItemTable.id)
    val item2 = reference("item2", ItemTable.id)
    val type = reference("type", PropertyTypeTable.id)
}


