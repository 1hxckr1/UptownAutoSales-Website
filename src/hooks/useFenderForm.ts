import { useState } from 'react';
import { fenderApi, FormSubmission, FormSubmissionResponse } from '../lib/fenderApi';

interface UseFenderFormReturn {
  submitForm: (payload: FormSubmission) => Promise<FormSubmissionResponse>;
  submitting: boolean;
  error: string | null;
  success: boolean;
  submissionId: string | null;
  reset: () => void;
}

export function useFenderForm(): UseFenderFormReturn {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  const submitForm = async (payload: FormSubmission): Promise<FormSubmissionResponse> => {
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    setSubmissionId(null);

    try {
      const result = await fenderApi.submitForm(payload);
      setSuccess(true);
      setSubmissionId(result.submission_id);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while submitting the form';
      setError(errorMessage);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSubmitting(false);
    setError(null);
    setSuccess(false);
    setSubmissionId(null);
  };

  return { submitForm, submitting, error, success, submissionId, reset };
}
