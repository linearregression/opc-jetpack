/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Audio Recorder.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Labs
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Anant Narayanan <anant@kix.in>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

#include "AudioRecorder.h"

#include "prmem.h"
#include "nsIFile.h"
#include "nsAutoPtr.h"
#include "nsStringAPI.h"
#include "nsDirectoryServiceDefs.h"
#include "nsDirectoryServiceUtils.h"
#include "nsComponentManagerUtils.h"

extern "C" {

#include "CAudioRecorder.h"

static int recordCallback(const void *input, void *output,
        unsigned long framesPerBuffer,
        const PaStreamCallbackTimeInfo* timeInfo,
        PaStreamCallbackFlags statusFlags,
        void *userData)
{
    unsigned long i;
    const float *rptr = (const float *)input;

    if (input != NULL) {
        for (i = 0; i < framesPerBuffer; i++) {
            sf_writef_float(outfile, rptr, 1);
            rptr++; // left channel
            rptr++; // right channel
        }
    }
    return paContinue;
}

static int
initialize_portaudio()
{
    PaError err = paNoError;
    PaStreamParameters inputParameters;

    err = Pa_Initialize();
    if (err != paNoError) {
        return err;
    }

    inputParameters.device = Pa_GetDefaultInputDevice();
    inputParameters.channelCount = 2;
    inputParameters.sampleFormat = PA_SAMPLE_TYPE;
    inputParameters.suggestedLatency =
        Pa_GetDeviceInfo(inputParameters.device)->defaultLowInputLatency;
    inputParameters.hostApiSpecificStreamInfo = NULL;

    err = Pa_OpenStream(
            &stream,
            &inputParameters,
            NULL,
            SAMPLE_RATE,
            FRAMES_PER_BUFFER,
            paClipOff,
            recordCallback,
            NULL
    );
    
    return (int)err;
}

}

NS_IMPL_ISUPPORTS1(AudioRecorder, IAudioRecorder)

AudioRecorder::AudioRecorder()
{
    stream = NULL;
    recording = 0;
    outfile = NULL;
    filename = NULL;

    PaError err;
    if ((err = initialize_portaudio()) != paNoError) {
        fprintf(stderr, "JEP Audio:: Could not initialize PortAudio! %d\n", err);
    }
}

AudioRecorder::~AudioRecorder()
{
    PaError err;
    if ((err = Pa_Terminate()) != paNoError) {
        fprintf(stderr, "JEP Audio:: Could not terminate PortAudio! %d\n", err);
    }
}

/*
 * This code is ripped from profile/src/nsProfile.cpp and is further
 * duplicated in uriloader/exthandler.  this should probably be moved
 * into xpcom or some other shared library.
 */ 
static void
MakeRandomString(char *buf, PRInt32 bufLen)
{
    // turn PR_Now() into milliseconds since epoch
    // and salt rand with that.
    double fpTime;
    LL_L2D(fpTime, PR_Now());

    // use 1e-6, granularity of PR_Now() on the mac is seconds
    srand((uint)(fpTime * 1e-6 + 0.5));   
    PRInt32 i;
    for (i=0;i<bufLen;i++) {
        *buf++ = table[rand()%TABLE_SIZE];
    }
    *buf = 0;
}

/*
 * Start recording
 */
NS_IMETHODIMP
AudioRecorder::Start()
{
    if (recording) {
        fprintf(stderr, "JEP Audio:: Recording in progress!\n");
        return NS_ERROR_FAILURE;
    }

    PaError err;
    nsresult rv;
    nsCOMPtr<nsIFile> o;

    /* Allocate OGG file */
    char buf[13];
    nsCAutoString path;

    rv = NS_GetSpecialDirectory(NS_OS_TEMP_DIR, getter_AddRefs(o));
    if (NS_FAILED(rv)) return rv;

    MakeRandomString(buf, 8);
    memcpy(buf + 8, ".ogg", 5);
    rv = o->AppendNative(nsDependentCString(buf, 12));
    if (NS_FAILED(rv)) return rv;
    rv = o->CreateUnique(nsIFile::NORMAL_FILE_TYPE, 0600);
    if (NS_FAILED(rv)) return rv;
    rv = o->GetNativePath(path);
    if (NS_FAILED(rv)) return rv;
    rv = o->Remove(PR_FALSE);
    if (NS_FAILED(rv)) return rv;

    /* Store tmpfile name */
    filename = (char *)PR_Calloc(strlen(path.get()) + 1, sizeof(char));
    memcpy(filename, path.get(), strlen(path.get()));

    /* Open file in libsndfile */
    SF_INFO info;
    info.channels = NUM_CHANNELS;
    info.samplerate = SAMPLE_RATE;
    info.format = SF_FORMAT_OGG | SF_FORMAT_VORBIS;

    if (!(outfile = sf_open(filename, SFM_WRITE, &info))) {
        sf_perror(NULL);
        return NS_ERROR_FAILURE;
    }

    /* Start recording */
    recording = 1;
    err = Pa_StartStream(stream);
    if (err != paNoError) {
        fprintf(stderr, "JEP Audio:: Could not start stream! %d", err);
        return NS_ERROR_FAILURE;
    }

    return NS_OK;
}

/*
 * Stop recording
 */
NS_IMETHODIMP
AudioRecorder::Stop(nsACString& final)
{
    if (!recording) {
        fprintf(stderr, "JEP Audio:: No recording in progress!\n");
        return NS_ERROR_FAILURE;    
    }

    Pa_StopStream(stream);
    sf_close(outfile);
    final.Assign(filename, strlen(filename));
    PR_Free(filename);

    recording = 0;
    return NS_OK;
}
