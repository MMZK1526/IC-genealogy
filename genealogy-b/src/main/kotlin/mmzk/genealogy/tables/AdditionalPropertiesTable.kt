package mmzk.genealogy.tables

import org.jetbrains.exposed.sql.Table

object AdditionalPropertiesTable: Table("additional_properties") {
    val individualId = varchar("individual_id", 32).primaryKey().references(IndividualTable.id)
    val propertyName = varchar("property_name", 255).primaryKey()
    val value = blob("value").nullable()
    val type = varchar("type", 32)
}