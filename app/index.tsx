import RadioButtonGroup from '../components/RadioButtonGroup';

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Image } from 'react-native';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  ScrollView,
  StyleSheet, // Used for platform-specific styling if needed
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
// Import Picker for select dropdowns. Install it if you haven't: npx expo install @react-native-picker/picker

// Helper function to calculate age from DOB
const calculateAge = (dob) => {
  if (!dob) return '';
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Print component
async function exportToPDF() {
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { color: #4f46e5; font-size: 24px; }
          h2 { font-size: 18px; margin-top: 24px; }
          p { font-size: 14px; line-height: 1.6; }
          .summary { background: #eef2ff; padding: 16px; border-radius: 8px; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <h1>Treatment Recommendation Summary</h1>
        <div class="summary">
          <p><strong>Composite Score:</strong> ${compositeScore.toFixed(2)}</p>
          <p><strong>Recommended Treatment:</strong> ${recommendation}</p>
        </div>
        <h2>Clinical Notes</h2>
        <p>${clinicalNotes.replace(/\n/g, '<br />')}</p>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
  } else {
    alert('Sharing is not available on this device');
  }
}

// Main App component
const App = () => {
  // Patient Information
  const [patientName, setPatientName] = useState('');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState(''); // Calculated age

  // State variables for all assessment input fields
  const [dass21Score, setDass21Score] = useState('');
  const [catsScore, setCatsScore] = useState('');
  const [whodasScore, setWhodasScore] = useState('');
  const [clinicalInterviewRisk, setClinicalInterviewRisk] = useState(''); // Mild, Moderate, Severe

  // BrainSpan & Neurotransmitter with new checkbox and dropdown logic
  const [brainSpanRun, setBrainSpanRun] = useState(false);
  const [brainSpanOutcome, setBrainSpanOutcome] = useState(''); // 'Yes' or 'No'

  const [neurotransmitterRun, setNeurotransmitterRun] = useState(false);
  const [neurotransmitterOutcome, setNeurotransmitterOutcome] = useState(''); // 'Yes' or 'No'

  // Override flags
  const [cssrsSuicidalIdeation, setCssrsSuicidalIdeation] = useState(false); // Yes/No for override
  const [qEEGIndicators, setQEEGIndicators] = useState(false); // Severe dissociation/psychosis for override

  // State variables for output
  const [recommendation, setRecommendation] = useState('Please enter all assessment data to get a recommendation.');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [compositeScore, setCompositeScore] = useState(0);

  // Effect to calculate age whenever DOB changes
  useEffect(() => {
    setAge(calculateAge(dob));
  }, [dob]);

  // Function to calculate the composite score and recommendation
  const calculateRecommendation = useCallback(() => {
    // Convert all numeric inputs to numbers, default to 0 if empty or invalid
    const numAge = Number(age);
    const numDass21Score = Number(dass21Score) || 0;
    const numCatsScore = Number(catsScore) || 0;
    const numWhodasScore = Number(whodasScore) || 0;

    // Map clinical interview risk to a numeric score that is its direct weighted contribution
    let clinicalInterviewWeighted = 0; // This will directly be the weighted contribution (0, 10, or 15)
    if (clinicalInterviewRisk === 'Mild') clinicalInterviewWeighted = 0;
    if (clinicalInterviewRisk === 'Moderate') clinicalInterviewWeighted = 10;
    if (clinicalInterviewRisk === 'Severe') clinicalInterviewWeighted = 15;

    // CATS is only used for 13-17 age group. If outside, its contribution is 0.
    const effectiveCatsScore = (numAge >= 13 && numAge <= 17) ? numCatsScore : 0;

    // --- Step 1: Calculate Composite Score (0–100) ---
    // Normalize scores to a 0-100 scale based on their maximum possible values
    // then multiply by their respective weights.

    // DASS-21: Max 63, weight 25%
    const dass21Weighted = (numDass21Score / 63) * 25;

    // CATS: Max 60, weight 20% (age-gated)
    const catsWeighted = (effectiveCatsScore / 60) * 20;

    // WHODAS 2.0: Max 60, weight 20% (updated max range)
    const whodasWeighted = (numWhodasScore / 60) * 20;

    // Sum of the weighted scores from contributing assessments
    const sumOfWeightedScores =
      dass21Weighted +
      catsWeighted +
      whodasWeighted +
      clinicalInterviewWeighted;

    // The total weight of contributing assessments is 25 (DASS) + 20 (CATS) + 20 (WHODAS) + 15 (Clinical) = 80.
    // To scale the composite score to 0-100, divide by the sum of actual weights and multiply by 100.
    const currentCompositeScore = (sumOfWeightedScores / 80) * 100;
    setCompositeScore(currentCompositeScore);

    let currentRecommendation = '';
    let currentClinicalNotes = [];

    // Add patient info
    if (patientName) currentClinicalNotes.push(`Patient Name: ${patientName}`);
    if (dob) currentClinicalNotes.push(`Date of Birth: ${dob} (Age: ${age} years)`);

    // Add DASS-21 score and severity
    if (dass21Score !== '') {
      let dass21Severity = '';
      if (numDass21Score >= 39) dass21Severity = 'Extremely Severe';
      else if (numDass21Score >= 30) dass21Severity = 'Severe';
      else if (numDass21Score >= 21) dass21Severity = 'Moderate';
      else if (numDass21Score >= 15) dass21Severity = 'Mild';
      else dass21Severity = 'Normal';
      currentClinicalNotes.push(`DASS-21 Total Score: ${numDass21Score} (Max 63). Severity: ${dass21Severity}`);
    }

    // Add CATS score and severity
    if (catsScore !== '') {
      let catsSeverity = '';
      if (numCatsScore >= 21) catsSeverity = 'Severe';
      else if (numCatsScore >= 16) catsSeverity = 'Moderate';
      else catsSeverity = 'Normal';
      currentClinicalNotes.push(`CATS Score: ${numCatsScore} (Max 60, applicable for age 13-17). Severity: ${catsSeverity}`);
    }

    // Add WHODAS 2.0 score and severity
    if (whodasScore !== '') {
      let whodasSeverity = '';
      if (numWhodasScore >= 51) whodasSeverity = 'Extreme disability';
      else if (numWhodasScore >= 41) whodasSeverity = 'Severe disability';
      else if (numWhodasScore >= 31) whodasSeverity = 'Moderate disability';
      else if (numWhodasScore >= 21) whodasSeverity = 'Mild disability';
      else if (numWhodasScore >= 12) whodasSeverity = 'Little to no disability';
      else whodasSeverity = 'Not indicated (score below 12)'; // Scores below 12
      currentClinicalNotes.push(`WHODAS 2.0 Score: ${numWhodasScore} (Max 60). Severity: ${whodasSeverity}`);
    }

    // Add Clinical Interview Risk
    if (clinicalInterviewRisk !== '') currentClinicalNotes.push(`Clinical Interview Risk: ${clinicalInterviewRisk}`);

    // BrainSpan notes (informational only, not for scoring)
    if (brainSpanRun) {
      currentClinicalNotes.push(`BrainSpan Nutritional + Inflammation: Test Run (Outcome: ${brainSpanOutcome || 'Not selected'})`);
    } else {
      currentClinicalNotes.push(`BrainSpan Nutritional + Inflammation: Test Not Run`);
    }

    // Neurotransmitter notes (informational only, not for scoring)
    if (neurotransmitterRun) {
      currentClinicalNotes.push(`Neurotransmitter Panel: Test Run (Outcome: ${neurotransmitterOutcome || 'Not selected'})`);
    } else {
      currentClinicalNotes.push(`Neurotransmitter Panel: Test Not Run`);
    }

    // QEEG and C-SSRS remain as overrides
    if (qEEGIndicators) currentClinicalNotes.push("QEEG: Severe dissociation/psychosis indicators present.");
    if (cssrsSuicidalIdeation) currentClinicalNotes.push("C-SSRS: Recent suicidal plan/intent indicated.");

    // --- Step 2: Apply Risk Flags (Overrides) ---
    if (cssrsSuicidalIdeation || qEEGIndicators) {
      currentRecommendation = 'Immediate Inpatient/Residential recommended due to high risk factors.';
      setRecommendation(currentRecommendation);
      setClinicalNotes(currentClinicalNotes.join('\n'));
      return; // Override, so no further banding needed
    }

    // --- Step 3: Age Filter ---
    const isAgeEligibleForIOPPHP = (numAge >= 13 && numAge <= 17);

    // --- Step 4: Match to Recommendation Band ---
    if (currentCompositeScore >= 85) {
      currentRecommendation = 'Inpatient/Residential';
    } else if (currentCompositeScore >= 70) {
      currentRecommendation = isAgeEligibleForIOPPHP ? 'PHP (Partial Hospitalization Program) or Inpatient' : 'Inpatient';
    } else if (currentCompositeScore >= 50) {
      currentRecommendation = isAgeEligibleForIOPPHP ? 'IOP (Intensive Outpatient Program) or PHP (if higher trauma or functional impairment)' : 'Individual Counseling or Inpatient (PHP/IOP excluded by age)';
    } else if (currentCompositeScore >= 30) {
      currentRecommendation = isAgeEligibleForIOPPHP ? 'Individual Counseling or IOP (Intensive Outpatient Program)' : 'Individual Counseling';
    } else { // 0-29
      currentRecommendation = 'Individual Counseling';
    }

    // Age-based exclusion clarification for non-override cases (if IOP/PHP was a potential match)
    if (!isAgeEligibleForIOPPHP && !cssrsSuicidalIdeation && !qEEGIndicators && numAge !== '') {
      if (currentCompositeScore >= 30) { // Composite score high enough to consider IOP/PHP if age eligible
        currentRecommendation += ` (Note: IOP/PHP excluded for age ${numAge})`;
      }
    }

    setRecommendation(currentRecommendation);
    setClinicalNotes(currentClinicalNotes.join('\n'));

  }, [age, dass21Score, catsScore, whodasScore, cssrsSuicidalIdeation, qEEGIndicators, clinicalInterviewRisk, brainSpanRun, brainSpanOutcome, neurotransmitterRun, neurotransmitterOutcome, patientName, dob]);

  // Effect to recalculate recommendation whenever inputs change
  useEffect(() => {
    calculateRecommendation();
  }, [calculateRecommendation]);

const exportToPDF = async () => {
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { color: #4f46e5; font-size: 24px; }
          h2 { font-size: 18px; margin-top: 24px; }
          p { font-size: 14px; line-height: 1.6; }
          .summary { background: #eef2ff; padding: 16px; border-radius: 8px; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <h1>Treatment Recommendation Summary</h1>
        <div class="summary">
          <p><strong>Composite Score:</strong> ${compositeScore.toFixed(2)}</p>
          <p><strong>Recommended Treatment:</strong> ${recommendation}</p>
        </div>
        <h2>Clinical Notes</h2>
        <p>${clinicalNotes.replace(/\n/g, '<br />')}</p>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
  } else {
    alert('Sharing is not available on this device');
  }
};

  return (
    // ScrollView allows content to be scrollable on small screens
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Image
          source={require('../assets/images/Logos-Logo.png')} // Adjust path if needed
          style={styles.logo}
        />

        <Text style={styles.header}>Treatment Recommendation Protocol</Text>

        {/* Patient Information Section */}
        <View style={styles.patientInfoSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Patient Name</Text>
            <TextInput
              style={styles.textInput}
              value={patientName}
              onChangeText={setPatientName}
              placeholder="e.g., Jane Doe"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={styles.textInput}
              value={dob}
              onChangeText={setDob}
              placeholder="YYYY-MM-DD"
              keyboardType="numeric" // Suggests numeric keyboard for date input
            />
            {age !== '' && (
              <Text style={styles.ageText}>Calculated Age: <Text style={styles.ageValue}>{age} years</Text></Text>
            )}
          </View>
        </View>

        {/* Assessment Inputs - Two Columns (Flexbox based) */}
        <View style={styles.columnsContainer}>
          {/* Left Column */}
          <View style={styles.column}>
            {/* DASS-21 Score */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>DASS-21 Score (0-63, Higher = Worse)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={dass21Score}
                onChangeText={setDass21Score}
                placeholder="0-63"
                maxLength={2} // Max 2 digits (up to 63)
              />
            </View>

            {/* CATS Score */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CATS Score (0-60, Higher = Worse, Youth 13-17 only)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={catsScore}
                onChangeText={setCatsScore}
                placeholder="0-60"
                maxLength={2} // Max 2 digits (up to 60)
              />
            </View>

            {/* WHODAS 2.0 Score */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>WHODAS 2.0 Score (0-60, Higher = Worse)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={whodasScore}
                onChangeText={setWhodasScore}
                placeholder="0-60"
                maxLength={2} // Max 2 digits (up to 60)
              />
            </View>

            {/* Clinical Interview Risk */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Clinical Interview Risk Level</Text>
                <RadioButtonGroup
                  options={[
                    { label: 'Mild', value: 'Mild' },
                    { label: 'Moderate', value: 'Moderate' },
                    { label: 'Severe', value: 'Severe' },
                  ]}
                  selected={clinicalInterviewRisk}
                  onSelect={setClinicalInterviewRisk}
                />
            </View>
          </View>

          {/* Right Column */}
          <View style={styles.column}>
            {/* BrainSpan Input (Switch + Outcome) */}
            <View style={styles.testPanel}>
               <View style={styles.switchGroup}>
                <Switch onValueChange={setBrainSpanRun} value={brainSpanRun} />
                <Text style={styles.switchLabel}>BrainSpan Nutritional + Inflammation Test Run?</Text>
              </View>

            {brainSpanRun && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>BrainSpan Outcome</Text>
                <RadioButtonGroup
                  options={[
                    { label: 'Yes (High Inflammation/Imbalance)', value: 'Yes' },
                    { label: 'No (Normal)', value: 'No' },
                  ]}
                  selected={brainSpanOutcome}
                  onSelect={setBrainSpanOutcome}
                />
              </View>
            )}
          </View>


            {/* Neurotransmitter Input (Switch + Outcome) */}
            <View style={styles.testPanel}>
              <View style={styles.switchGroup}>
                <Switch onValueChange={setNeurotransmitterRun} value={neurotransmitterRun} />
                <Text style={styles.switchLabel}>Neurotransmitter Panel Test Run?</Text>
              </View>
              {neurotransmitterRun && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Neurotransmitter Outcome</Text>
                  <RadioButtonGroup
                    options={[
                    { label: 'Yes (Imbalance)', value: 'Yes' },
                    { label: 'No (Normal)', value: 'No' },
                  ]}
                  selected={neurotransmitterOutcome}
                  onSelect={setNeurotransmitterOutcome}
                />
              </View>
            )}
          </View>

            {/* C-SSRS Suicidal Ideation */}
            <View style={styles.switchGroupLarge}>
              <Switch
                onValueChange={setCssrsSuicidalIdeation}
                value={cssrsSuicidalIdeation}
              />
              <Text style={styles.switchLabel}>C-SSRS: Recent suicidal plan/intent indicated?</Text>
            </View>

            {/* QEEG Severe Indicators */}
            <View style={styles.switchGroupLarge}>
              <Switch
                onValueChange={setQEEGIndicators}
                value={qEEGIndicators}
              />
              <Text style={styles.switchLabel}>QEEG/Clinical Interview: Severe dissociation/psychosis indicators?</Text>
            </View>
          </View>
        </View>

        {/* Recommendation Output */}
        <View style={styles.outputSection}>
          <Text style={styles.outputHeader}>Recommendation Summary</Text>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>Composite Score: <Text style={styles.summaryValue}>{compositeScore.toFixed(2)}</Text></Text>
            <Text style={styles.summaryText}>Recommended Treatment: <Text style={styles.summaryValue}>{recommendation}</Text></Text>
          </View>
          <View style={styles.notesBox}>
            <Text style={styles.notesHeader}>Clinical Notes:</Text>
            <Text style={styles.notesText}>{clinicalNotes || 'No specific clinical notes generated yet.'}</Text>
          </View>
        </View>
      </View>
      <View style={{ marginTop: 20, marginBottom: 40 }}>
        <Button title="Export as PDF" onPress={exportToPDF} />
      </View>


    </ScrollView>
  );
};

// Stylesheet for React Native components
const styles = StyleSheet.create({
  container: {
    flex: 1, // Take up full screen
    backgroundColor: '#f3f4f6', // bg-gray-100
  },
  card: {
    backgroundColor: '#fff', // bg-white
    borderRadius: 8, // rounded-lg
    margin: 16, // p-4 margin from edges
    padding: 24, // p-8 inner padding
    shadowColor: '#000', // shadow-xl
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8, // For Android shadow
    borderWidth: 1, // border border-gray-200
    borderColor: '#e5e7eb',
  },
  header: {
    fontSize: 24, // text-3xl
    fontWeight: 'bold', // font-bold
    textAlign: 'center', // text-center
    color: '#4f46e5', // text-indigo-700
    marginBottom: 20, // mb-6
    paddingBottom: 16, // pb-4
    borderBottomWidth: 1, // border-b
    borderBottomColor: '#e5e7eb', // border-gray-200
  },
  patientInfoSection: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allows wrapping on smaller screens
    justifyContent: 'space-between',
    marginBottom: 24, // mb-8
    padding: 16, // p-4
    backgroundColor: '#e0f2fe', // bg-blue-50
    borderRadius: 6, // rounded-md
    borderWidth: 1, // border border-blue-200
    borderColor: '#bfdbfe',
  },
  inputGroup: {
    marginBottom: 16, // Consistent spacing between inputs
    width: '100%', // Default to full width
    // On larger screens, take half width for two columns
    '@media (min-width: 768px)': {
      width: '48%', // md:col-span-1 for two columns
    },
  },
  label: {
    fontSize: 14, // text-sm
    fontWeight: '500', // font-medium
    color: '#374151', // text-gray-700
    marginBottom: 4, // mb-1
  },
  textInput: {
    height: 40, // py-2
    borderWidth: 1, // border
    borderColor: '#d1d5db', // border-gray-300
    borderRadius: 6, // rounded-md
    paddingHorizontal: 12, // px-3
    backgroundColor: '#fff', // Consistent background
    fontSize: 16, // sm:text-sm
    color: '#1f2937',
  },
  ageText: {
    marginTop: 8, // mt-2
    fontSize: 14, // text-sm
    color: '#4b5563', // text-gray-600
  },
  ageValue: {
    fontWeight: '600', // font-semibold
  },
  columnsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allows columns to stack on smaller screens
    justifyContent: 'space-between', // gap-6
    marginBottom: 24, // mb-8
  },
  column: {
    width: '100%', // Default to full width on small screens
    marginBottom: 24, // space between columns when stacked
    // On larger screens, take half width
    '@media (min-width: 768px)': {
      width: '48%', // md:grid-cols-2 equivalent for two columns
    },
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    overflow: 'hidden', // Ensures picker content stays within bounds
    backgroundColor: '#fff',
  },
  picker: {
    height: 40, // Equivalent to py-2 for textInput
    width: '100%',
    color: '#1f2937', // Text color
  },
  testPanel: {
    padding: 16, // p-4
    borderWidth: 1, // border
    borderColor: '#e5e7eb', // border-gray-200
    borderRadius: 6, // rounded-md
    backgroundColor: '#f9fafb', // bg-gray-50
    marginBottom: 16, // Consistent gap
  },
  switchGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8, // mb-2
  },
  switchGroupLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16, // mt-4
  },
  switchLabel: {
    marginLeft: 8, // ml-2
    fontSize: 14, // text-sm
    fontWeight: '500', // font-medium
    color: '#374151', // text-gray-700
    flexShrink: 1, // Allow text to wrap
  },
  outputSection: {
    marginTop: 32, // mt-8
    paddingTop: 24, // pt-6
    borderTopWidth: 1, // border-t
    borderTopColor: '#e5e7eb', // border-gray-200
  },
  outputHeader: {
    fontSize: 20, // text-2xl
    fontWeight: 'bold', // font-bold
    color: '#4f46e5', // text-indigo-700
    marginBottom: 16, // mb-4
  },
  summaryBox: {
    backgroundColor: '#eef2ff', // bg-indigo-50
    padding: 16, // p-4
    borderRadius: 6, // rounded-md
    borderWidth: 1, // border border-indigo-200
    borderColor: '#c7d2fe',
    marginBottom: 16, // Space below it
  },
  summaryText: {
    fontSize: 16, // text-lg
    fontWeight: '600', // font-semibold
    color: '#3730a3', // text-indigo-800
    marginBottom: 4, // for line spacing
  },
  summaryValue: {
    fontWeight: 'bold', // font-bold
    color: '#251c8a', // text-indigo-900
  },
  notesBox: {
    marginTop: 16, // mt-4
    backgroundColor: '#f9fafb', // bg-gray-50
    padding: 16, // p-4
    borderRadius: 6, // rounded-md
    borderWidth: 1, // border border-gray-200
    borderColor: '#e5e7eb',
  },
  notesHeader: {
    fontSize: 16, // text-lg
    fontWeight: '600', // font-semibold
    color: '#374151', // text-gray-800
    marginBottom: 8, // mb-2
  },
  notesText: {
    fontSize: 14, // text-sm
    color: '#4b5563', // text-gray-700
    // No direct equivalent for whitespace-pre-wrap, but Text component handles newlines
  },
  logo: {
  width: 160,
  height: 60,
  resizeMode: 'contain',
  alignSelf: 'center',
  marginBottom: 16,
}
});

export default App;


