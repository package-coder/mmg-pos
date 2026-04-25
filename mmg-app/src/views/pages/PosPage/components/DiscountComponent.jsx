import React, { memo, useState } from 'react';
import { Typography, Grid, Button, Dialog, DialogContent, DialogTitle, TextField, IconButton, CircularProgress, Stack } from '@mui/material';
import { IoCloseOutline, IoRefresh } from 'react-icons/io5';
import { MdDiscount } from 'react-icons/md';

// component import
import { Box, useTheme } from '@mui/system';
import _package from 'api/package';
import { useQuery } from 'react-query';
import { useHotkeys } from 'react-hotkeys-hook';
import { toLower } from 'lodash';

export default memo(function ({ onSelectDiscount, disabled, discountsData, buttonProps }) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);

    const onToggle = () => {
        if (disabled) return;
        setOpen((open) => !open);
        setSearch('');
    };

    const handleSelectItem = (item) => () => {
        console.log('item', item);
        onToggle();
        onSelectDiscount(item);
    };

    const selectFirstItem = (search) => {
        const firstItem = discountsData.filter((item) => toLower(item.name).startsWith(toLower(search)))?.[0];
        return firstItem;
    };

    const handleKeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            if (discountsData && discountsData.length == 0) {
                onToggle();
                return;
            }

            const firstItem = selectFirstItem(search);
            if (firstItem) {
                handleSelectItem(firstItem)();
            }

            return;
        }

        if (e.key === 'Backspace' && !e?.target?.value) {
            e.preventDefault();
            onToggle();

            return;
        }
    };

    useHotkeys('f7', onToggle, { preventDefault: true });

    return (
        <>
            <Button
                {...buttonProps}
                variant="contained"
                color="dark"
                fullWidth
                startIcon={<MdDiscount />}
                sx={{
                    py: 2,
                    height: '100%',
                    textWrap: 'nowrap',
                    overflow: 'hidden',
                    ...buttonProps?.sx
                }}
                onClick={onToggle}
                disabled={disabled}
            >
                Discount (F7)
            </Button>
            {open && (
                <Dialog
                    open
                    disableRestoreFocus
                    onClose={onToggle}
                    maxWidth="sm"
                    fullWidth
                    sx={{
                        '& .MuiPaper-root': {
                            height: '65%'
                        }
                    }}
                >
                    <DialogTitle sx={{ pt: 2 }}>
                        <Stack direction='row' spacing={1} alignItems='center' justifyContent='space-between' >
                            <Typography variant="h4">Select Discount</Typography>
                            {/* <Box flex={1} />
                            {
                                isRefetching || isLoading ? <CircularProgress size={20}/>
                                : <Button startIcon={<IoRefresh />} onClick={refetch} size='small'>Refresh</Button>
                            } */}
                            <IconButton onClick={onToggle}>
                                <IoCloseOutline />
                            </IconButton>
                        </Stack>
                    </DialogTitle>
                    <DialogContent sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <TextField
                            placeholder="Search"
                            fullWidth
                            sx={{
                                pt: 1,
                                '& .MuiOutlinedInput-notchedOutline': {},
                                bgcolor: 'white'
                            }}
                            value={search}
                            onKeyDown={handleKeydown}
                            onChange={(e) => setSearch(e.target?.value)}
                            size="small"
                            autoFocus
                        />
                        <Typography ml={1} mt={0.5} mb={1.5} variant="h6" color="primary.main">
                            Press 'Enter' to select the first item on the list.
                        </Typography>
                        <Box flex={1} flexBasis={80} overflow="auto">
                            <Grid container spacing={1}>
                                {discountsData && discountsData.length > 0 ? (
                                    discountsData
                                        .filter((item) => toLower(item.name).includes(toLower(search)))
                                        .map((item, index) => {
                                            return (
                                                <Grid key={index} item xs={4}>
                                                    <Button
                                                        sx={{
                                                            py: 2,
                                                            borderRadius: 3,
                                                            textWrap: 'nowrap',
                                                            overflow: 'hidden'
                                                        }}
                                                        fullWidth
                                                        variant="outlined"
                                                        onClick={handleSelectItem(item)}
                                                        disabled={item.name === 'Packages' || item.name === 'Promos'}
                                                    >
                                                        {item.name}
                                                    </Button>
                                                </Grid>
                                            );
                                        })
                                ) : (
                                    <span>No discount available</span>
                                )}
                            </Grid>
                        </Box>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
});
