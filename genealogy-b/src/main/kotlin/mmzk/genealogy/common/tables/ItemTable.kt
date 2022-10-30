package mmzk.genealogy.common.tables

object ItemTable : StringIdTable() {
    val name = varchar("name", 255)
    val description = text("description")
    val aliases = text("aliases").nullable()
}
