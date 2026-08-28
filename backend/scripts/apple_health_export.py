import xml.etree.ElementTree as ET
#https://medium.com/internet-of-technology/how-to-extract-and-analyze-apple-health-data-a-practical-python-guide-4b9ddbade37f
#uses that website as a guide

# Load and parse the XML file.
# (Optional): Load and parse the export_cda.xml file.
xml_path = "/Users/madelinedavis/Library/Mobile Documents/com~apple~CloudDocs/Desktop/apple_health_export 4/export.xml"
tree = ET.parse(xml_path)
root = tree.getroot()

# Create a set to store unique @type values.
types_set = set()

# Iterate through the XML elements and extract @type attribute.
for record in root.findall('.//Record'):
    type_attribute = record.get('type')
    if type_attribute:
        types_set.add(type_attribute)

# Print all unique @type values.
for type_value in types_set:
    print(type_value)

records = []

for record in root.findall(".//Record[@type='HKQuantityTypeIdentifierBasalEnergyBurned']"):
    records.append({
        'start_date': record.get('startDate'),
        'end_date': record.get('endDate'),
        'value': record.get('value'),
        'unit': record.get('unit'),
    })

print(records[:1])