package mmzk.genealogy.common.dto

import kotlinx.serialization.Serializable
import mmzk.genealogy.common.tables.AdditionalPropertyTable
import mmzk.genealogy.common.tables.AllPropertiesAndQualifiersView
import mmzk.genealogy.common.tables.PropertyTypeTable
import mmzk.genealogy.common.tables.QualifierTable
import mmzk.genealogy.common.tables.RelationshipTable.type
import org.jetbrains.exposed.sql.ResultRow

@Serializable
data class AdditionalPropertyDTO(
    var propertyId: String,
    var name: String,
    var value: String,
    val valueHash: String,
    val qualifiers: Set<QualifierDTO> = setOf(),
) {
    companion object {
        fun fromAllPropertiesAndQualifiersResultRow(row: ResultRow, qualifiers: Set<QualifierDTO>): AdditionalPropertyDTO? {
            val propertyId = row[AllPropertiesAndQualifiersView.propertyId]
            return propertyId?.let {
                AdditionalPropertyDTO(
                    it,
                    row[AllPropertiesAndQualifiersView.propertyName],
                    row[AllPropertiesAndQualifiersView.value],
                    row[AllPropertiesAndQualifiersView.valueHash],
                    qualifiers,
                )
            }
        }
    }
}

@Serializable
data class QualifierDTO(
    val typeId: String,
    val type: String,
    val value: String,
) {

    companion object {
        fun fromAllPropertiesAndQualifiersResultRow(row: ResultRow): QualifierDTO? {
            val typeId = row[AllPropertiesAndQualifiersView.qualifierType]
            return typeId?.let {
                QualifierDTO(
                    it,
                    row[AllPropertiesAndQualifiersView.qualifierName],
                    row[AllPropertiesAndQualifiersView.qualifierValue],
                )
            }
        }
    }
}
