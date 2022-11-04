package mmzk.genealogy.common.tables

import org.jetbrains.exposed.dao.IntIdTable
object RelationshipTable : IntIdTable() {
    val item1 = reference("item1", ItemTable)
    val item2 = reference("item2", ItemTable)
    val type = reference("type", PropertyTypeTable)
}
