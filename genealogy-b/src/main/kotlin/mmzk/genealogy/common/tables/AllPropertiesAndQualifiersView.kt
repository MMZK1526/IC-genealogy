package mmzk.genealogy.common.tables

import org.jetbrains.exposed.sql.Table

object AllPropertiesAndQualifiersView: Table("all_properties_and_qualifiers") {
    val id = varchar("id", 32)
    val name = varchar("name", 255)
    val description = text("description")
    val aliases = text("aliases").nullable()
    val propertyId = varchar("property_id", 32).nullable()
    val propertyName = varchar("property_name", 255)
    val value = text("value")
    val valueHash = text("value_hash")
    val qualifierType = varchar("qualifier_type", 32).nullable()
    val qualifierName = varchar("qualifier_name", 255)
    val qualifierValue = text("qualifier_value")
}