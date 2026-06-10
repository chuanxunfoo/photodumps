import AsyncStorage from '@react-native-async-storage/async-storage';



import { supabase } from '../(tabs)/supabase';



export type DeleteAccountResult = { ok: true } | { ok: false; error: string };



/** Permanently delete the signed-in user and local app data. */

export async function deleteUserAccount(): Promise<DeleteAccountResult> {

  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {

    return { ok: false, error: 'You must be signed in to delete your account.' };

  }



  const { data, error } = await supabase.functions.invoke('delete-account', {

    method: 'POST',

    headers: { Authorization: `Bearer ${session.access_token}` },

  });



  if (error) {

    const msg = error.message ?? 'Could not delete account.';

    if (/404|not found/i.test(msg)) {

      return {

        ok: false,

        error: 'Account deletion is not deployed yet. Deploy the delete-account Supabase Edge Function, then try again.',

      };

    }

    return { ok: false, error: msg };

  }



  const body = data as { error?: string } | null;

  if (body?.error) return { ok: false, error: body.error };



  await supabase.auth.signOut();

  await clearLocalUserData();



  return { ok: true };

}



async function clearLocalUserData(): Promise<void> {

  const keys = await AsyncStorage.getAllKeys();

  const dumpitKeys = keys.filter(k => k.startsWith('@dumpit') || k.startsWith('@photodumps'));

  if (dumpitKeys.length) await AsyncStorage.multiRemove(dumpitKeys);

}


