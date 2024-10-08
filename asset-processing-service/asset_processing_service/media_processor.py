import asyncio
import os
import shutil
import tempfile
import uuid
import ffmpeg


async def split_audio_file(audio_buffer: bytes, max_chunk_size_bytes: int, original_file_name: str):
    file_name_without_ext, file_extension = os.path.splitext(original_file_name)
    chunks = []
    temp_dir = tempfile.mkdtemp()

    try:
        # Write the original audio buffer to a temporary file
        temp_input_path = os.path.join(temp_dir, original_file_name)
        with open(temp_input_path, "wb") as f:
            f.write(audio_buffer)

        # Check if the file is an MP3 file
        if file_extension.lower() == ".mp3":
            print("Input is an MP3 file. Skipping conversion.")
            temp_mp3_path = temp_input_path
        else:
            print("Converting input audio to MP3 format.")
            temp_mp3_path = os.path.join(
                temp_dir, f"{file_name_without_ext}_converted.mp3"
            )
            await convert_audio_to_mp3(temp_input_path, temp_mp3_path)

        # Probe the audio file to get total size and duration
        probe = await asyncio.to_thread(ffmpeg.probe, temp_mp3_path)
        format_info = probe.get("format", {})
        total_size = int(format_info.get("size", 0))
        duration = float(format_info.get("duration", 0.0))

         # Calculate the number of chunks needed
        num_chunks = max(
            1, int((total_size + max_chunk_size_bytes - 1) // max_chunk_size_bytes)
        )

        # Calculate chunk duration
        chunk_duration = duration / num_chunks


        print("Total size: ", total_size)
        print("Duration: ", duration)
        print(f"Splitting into {num_chunks} chunks of {chunk_duration} seconds each.")

        # Split the audio file into chunks
        output_pattern = os.path.join(
            temp_dir, f"{file_name_without_ext}_chunk_%03d.mp3" 
        )
        split_cmd = ffmpeg.input(temp_mp3_path).output(
            output_pattern,
            format="segment",
            segment_time=chunk_duration,
            c="copy",
            reset_timestamps=1,
        )
        await asyncio.to_thread(
            ffmpeg.run, split_cmd, capture_stdout=True, capture_stderr=True
        )

        chunk_files = sorted(
            [
                f
                for f in os.listdir(temp_dir)
                if f.startswith(f"{file_name_without_ext}_chunk_")
                and f.endswith(".mp3")
            ]
        )

        for chunk_file_name in chunk_files:
            chunk_path = os.path.join(temp_dir, chunk_file_name)
            with open(chunk_path, "rb") as f:
                chunk_data = f.read()
            chunk_size = len(chunk_data)

            if chunk_size <= max_chunk_size_bytes:
                chunks.append(
                    {
                        "data": chunk_data,
                        "size": chunk_size,
                        "file_name": chunk_file_name,
                    }
                )
            else:
                print(
                    f"Chunk {chunk_file_name} exceeds the maximum size after splitting."
                )
                raise ValueError("Chunk size exceeds the maximum size after splitting.")

        return chunks


    except Exception as e:
        print(f"Error splitting audio file: {e}")
        raise
    finally:
        # Clean up temporary files
        shutil.rmtree(temp_dir)
    
    
async def convert_audio_to_mp3(input_path: str, output_path: str):
    """
    Converts an audio file to MP3 format.
    """
    try:
        # Use FFmpeg to convert the audio file to MP3
        conversion_cmd = ffmpeg.input(input_path).output(
            output_path,
            format="mp3",
            acodec="libmp3lame",
            q=0,
        )
        await asyncio.to_thread(
            ffmpeg.run, conversion_cmd, capture_stdout=True, capture_stderr=True
        )

        mp3_file_size = os.path.getsize(output_path)
        print(
            f"Converted MP3 file size: ({round(mp3_file_size / 1024 / 1024)} MB bytes"
        )
    except ffmpeg.Error as e:
        print(f"Error converting audio to MP3: {e.stderr.decode()}")
        raise


async def extract_audio_and_split(video_buffer: bytes, max_chunk_size_bytes: int, original_file_name: str):
    temp_dir = os.path.join(os.getcwd(), "temp", str(uuid.uuid4()))
    os.makedirs(temp_dir, exist_ok=True)

    base_file_name = os.path.basename(original_file_name)
    input_file = os.path.join(temp_dir, base_file_name)
    file_name_without_ext = os.path.splitext(base_file_name)[0]
    output_mp3 = os.path.join(temp_dir, f"{file_name_without_ext}.mp3")

    try:
        with open(input_file, "wb") as f:
            f.write(video_buffer)


        # Use ffmpeg-python instead of subprocess
        stream = ffmpeg.input(input_file)
        stream = ffmpeg.output(stream, output_mp3, acodec="libmp3lame", q=0, map="a")

        # Run ffmpeg asynchronously
        await asyncio.to_thread(
            ffmpeg.run, stream, capture_stdout=True, capture_stderr=True
        )

        with open(output_mp3, "rb") as f:
            mp3_buffer = f.read()
        chunks = await split_audio_file(
            mp3_buffer, max_chunk_size_bytes, f"{file_name_without_ext}.mp3"
        )

        return chunks

    except Exception as e:
        print(f"Error extracting audio and splitting: {e}")
        raise

    finally:
        # Clean up temporary files
        shutil.rmtree(temp_dir)
    