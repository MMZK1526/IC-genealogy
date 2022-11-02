package mmzk.genealogy.common.tables

object PropertyTypeTable : StringIdTable("property_type") {
    val name = varchar("property_name", 255)
}
